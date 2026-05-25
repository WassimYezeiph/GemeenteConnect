function setFormsToManualValidation() {
	document.querySelectorAll('form').forEach(form => {
		form.noValidate = true;
	});
}

function initializeGoodValidation() {
	document.querySelectorAll('.good-form input, .good-form select').forEach(field => {
		const messageElement = getGoodFieldMessageElement(field);

		if (!messageElement) {
			return;
		}

		field.setAttribute('aria-describedby', messageElement.id);
		field.addEventListener('input', () => validateGoodField(field));
		field.addEventListener('change', () => validateGoodField(field));
		field.addEventListener('blur', () => validateGoodField(field));
	});
}

function getGoodFieldMessageElement(field) {
	if (!field.id) {
		return null;
	}

	return document.getElementById(`${field.id}Message`);
}

function setGoodFieldState(field, message, isValid) {
	const messageElement = getGoodFieldMessageElement(field);

	if (messageElement) {
		messageElement.textContent = message;
		messageElement.classList.toggle('is-error', !isValid && Boolean(message));
		messageElement.classList.toggle('is-success', isValid && Boolean(message));
	}

	if (message) {
		field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
	} else {
		field.setAttribute('aria-invalid', 'false');
	}

	return isValid;
}

function validateGoodField(field) {
	if (!field || !field.id) {
		return true;
	}

	const value = field.value.trim();
	let isValid = true;
	let message = 'Correct ingevuld.';

	switch (field.id) {
		case 'goodService':
		case 'goodTime':
		case 'docType':
		case 'changeAction':
			isValid = value.length > 0;
			message = isValid ? 'Correct ingevuld.' : 'Maak een keuze.';
			break;
		case 'goodName': {
			const nameParts = value.split(/\s+/).filter(Boolean);
			isValid = nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
			message = isValid ? 'Naam is in orde.' : 'Gebruik minstens voor- en familienaam.';
			break;
		}
		case 'goodDate': {
			if (!value) {
				isValid = false;
				message = 'Kies een datum.';
				break;
			}

			const selectedDate = new Date(`${value}T00:00:00`);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			isValid = selectedDate > today;
			message = isValid ? 'Datum ligt in de toekomst.' : 'De datum moet in de toekomst liggen.';
			break;
		}
		case 'oldAddress':
		case 'newAddress':
			isValid = value.length >= 10;
			message = isValid ? 'Adres is duidelijk genoeg.' : 'Schrijf het volledige adres uit.';
			break;
		case 'moveDate': {
			if (!value) {
				isValid = false;
				message = 'Kies een verhuisdatum.';
				break;
			}

			const selectedMoveDate = new Date(`${value}T00:00:00`);
			const todayMove = new Date();
			todayMove.setHours(0, 0, 0, 0);
			isValid = selectedMoveDate >= todayMove;
			message = isValid ? 'Verhuisdatum is geldig.' : 'De verhuisdatum mag niet in het verleden liggen.';
			break;
		}
		case 'docReason':
			isValid = value.length >= 8;
			message = isValid ? 'Reden is duidelijk.' : 'Geef een iets uitgebreidere reden op.';
			break;
		case 'bookingCode':
			isValid = /^GEM-\d{4}-\d{4}$/.test(value);
			message = isValid ? 'Afspraakcode klopt.' : 'Gebruik het formaat GEM-2026-1234.';
			break;
		default:
			isValid = true;
			message = '';
	}

	return setGoodFieldState(field, message, isValid);
}

function validateGoodForm(form) {
	const fields = Array.from(form.querySelectorAll('input, select'));
	let firstInvalidField = null;
	let isValid = true;

	fields.forEach(field => {
		const fieldIsValid = validateGoodField(field);

		if (!fieldIsValid) {
			isValid = false;

			if (!firstInvalidField) {
				firstInvalidField = field;
			}
		}
	});

	return {
		isValid,
		firstInvalidField
	};
}

function getBadFormErrorMessage(formKind, form) {
	switch (formKind) {
		case 'appointment': {
			const procedure = form.querySelector('#badAppointmentProcedure');
			const nameField = form.querySelector('#badAppointmentName');
			const dateField = form.querySelector('#badAppointmentDate');
			const timeField = form.querySelector('#badAppointmentTime');

			if (!procedure || !procedure.value) {
				return 'Foutcode 401: Procedure token ontbreekt.';
			}

			if (!nameField || nameField.value.trim().length < 6) {
				return 'Foutcode 403: String constraints violated.';
			}

			if (!dateField || !dateField.value) {
				return 'Foutcode 412: Temporal stamp missing.';
			}

			const selectedDate = new Date(`${dateField.value}T00:00:00`);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (selectedDate <= today) {
				return 'Foutcode 412: Temporal order mismatch.';
			}

			if (!timeField || !timeField.value) {
				return 'Foutcode 422: Slot matrix rejected.';
			}

			return '';
		}
		case 'move': {
			const oldAddress = form.querySelector('#badOldAddress');
			const newAddress = form.querySelector('#badNewAddress');
			const moveDate = form.querySelector('#badMoveDate');
			const familySelect = form.querySelector('#badFamilySelect');

			if (!oldAddress || oldAddress.value.trim().length < 10) {
				return 'Foutcode 428: Origin address vector incomplete.';
			}

			if (!newAddress || newAddress.value.trim().length < 10) {
				return 'Foutcode 428: Destination address vector incomplete.';
			}

			if (!moveDate || !moveDate.value) {
				return 'Foutcode 409: Spatial timestamp missing.';
			}

			const selectedMoveDate = new Date(`${moveDate.value}T00:00:00`);
			const todayMove = new Date();
			todayMove.setHours(0, 0, 0, 0);
			if (selectedMoveDate < todayMove) {
				return 'Foutcode 409: Temporal relocation mismatch.';
			}

			if (!familySelect || !familySelect.value) {
				return 'Foutcode 428: Family-state flag absent.';
			}

			return '';
		}
		case 'docs': {
			const documentType = form.querySelector('#badDocumentType');
			const reasonField = form.querySelector('#badDocReason');

			if (!documentType || !documentType.value) {
				return 'Foutcode 451: Document ontology unresolved.';
			}

			if (!reasonField || reasonField.value.trim().length < 8) {
				return 'Foutcode 451: Semantic payload too short.';
			}

			return '';
		}
		case 'change': {
			const bookingCode = form.querySelector('#badBookingCode');
			const actionSelect = form.querySelector('#badChangeAction');

			if (!bookingCode || !/^GEM-\d{4}-\d{4}$/.test(bookingCode.value.trim())) {
				return 'Foutcode 409: Reservation token mismatch.';
			}

			if (!actionSelect || !actionSelect.value) {
				return 'Foutcode 422: Action vector missing.';
			}

			return '';
		}
		default:
			return 'Foutcode 400: Unknown form topology.';
	}
}

function showBadWarning(message) {
	const warning = document.getElementById('badWarning');

	if (!warning) {
		return;
	}

	warning.textContent = message;
	warning.classList.add('visible');
}

function hideBadWarning() {
	const warning = document.getElementById('badWarning');

	if (!warning) {
		return;
	}

	warning.classList.remove('visible');
}

function revealSuccessFeedback(feedbackId) {
	const feedback = document.getElementById(feedbackId);

	if (!feedback) {
		return;
	}

	feedback.style.display = 'block';
}
