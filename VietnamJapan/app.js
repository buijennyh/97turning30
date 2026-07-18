(function () {
  "use strict";

  var RSVP_STORAGE_KEY = "event-rsvp-vietnam-japan-2027";
  var RSVP_EDIT_DEADLINE = new Date(2027, 1, 13, 23, 59, 59);

  var form = document.getElementById("rsvp-form");
  var closedNotice = document.getElementById("rsvp-closed-notice");
  var existingNotice = document.getElementById("rsvp-existing-notice");
  var successMessage = document.getElementById("rsvp-success");
  var errorNotice = document.getElementById("rsvp-error-notice");
  var submitButton = document.getElementById("rsvp-submit");
  var weeksFieldset = document.getElementById("weeks-fieldset");
  var submitButtonDefaultText = submitButton.textContent;
  var errorNoticeDefaultText = errorNotice.textContent;
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/xjgqkzyk";

  function isEditingAllowed() {
    return new Date() <= RSVP_EDIT_DEADLINE;
  }

  function loadRsvp() {
    try {
      var raw = localStorage.getItem(RSVP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveRsvp(data) {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(data));
  }

  function populateForm(data) {
    document.getElementById("name").value = data.name || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("dietary").value = data.dietary || "";

    var attending = form.querySelector('input[name="attending"][value="' + data.attending + '"]');
    if (attending) attending.checked = true;

    var weekInputs = form.querySelectorAll('input[name="weeks"]');
    weekInputs.forEach(function (input) {
      input.checked = (data.weeks || []).indexOf(input.value) !== -1;
    });

    toggleWeeksFieldset(data.attending === "yes");
  }

  function toggleWeeksFieldset(show) {
    weeksFieldset.style.display = show ? "block" : "none";

    if (!show) {
      form.querySelectorAll('input[name="weeks"]').forEach(function (input) {
        input.checked = false;
        input.setCustomValidity("");
      });
    }
  }

  function validateForm() {
    var attending = form.querySelector('input[name="attending"]:checked');
    var weekInputs = form.querySelectorAll('input[name="weeks"]');

    weekInputs.forEach(function (input) {
      input.setCustomValidity("");
    });

    if (attending && attending.value === "yes") {
      var hasWeek = false;
      weekInputs.forEach(function (input) {
        if (input.checked) hasWeek = true;
      });
      if (!hasWeek && weekInputs.length) {
        weekInputs[0].setCustomValidity("Please select at least one week.");
      }
    }

    return form.checkValidity();
  }

  function collectFormData() {
    var attending = form.querySelector('input[name="attending"]:checked');
    var weeks = [];
    form.querySelectorAll('input[name="weeks"]:checked').forEach(function (input) {
      weeks.push(input.value);
    });

    return {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      attending: attending ? attending.value : "",
      weeks: weeks,
      dietary: document.getElementById("dietary").value.trim()
    };
  }

  function setFormDisabled(disabled) {
    form.classList.toggle("rsvp-form--disabled", disabled);
    submitButton.disabled = disabled;
  }

  function formatFormspreeError(body) {
    if (body && Array.isArray(body.errors) && body.errors.length) {
      return body.errors.map(function (error) {
        return error.message || error.code;
      }).join(" ");
    }

    if (body && body.error) {
      return body.error;
    }

    return "Form submission failed";
  }

  function init() {
    var existing = loadRsvp();
    var canEdit = isEditingAllowed();

    if (!canEdit) {
      closedNotice.classList.remove("rsvp-notice--hidden");
      setFormDisabled(true);

      if (existing) {
        populateForm(existing);
      }
      return;
    }

    if (existing) {
      existingNotice.classList.remove("rsvp-notice--hidden");
      submitButtonDefaultText = "Update RSVP";
      submitButton.textContent = submitButtonDefaultText;
      populateForm(existing);
    } else {
      toggleWeeksFieldset(false);
    }

    form.querySelectorAll('input[name="attending"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        toggleWeeksFieldset(radio.value === "yes" && radio.checked);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!isEditingAllowed()) {
        closedNotice.classList.remove("rsvp-notice--hidden");
        setFormDisabled(true);
        return;
      }

      if (!validateForm()) {
        form.reportValidity();
        return;
      }

      errorNotice.textContent = errorNoticeDefaultText;
      errorNotice.classList.add("rsvp-notice--hidden");
      successMessage.classList.add("rsvp-notice--hidden");
      submitButton.disabled = true;
      submitButton.textContent = "Submitting…";

      fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) {
              throw new Error(formatFormspreeError(body));
            }
            return body;
          });
        })
        .then(function () {
          var data = collectFormData();
          saveRsvp(data);

          successMessage.classList.remove("rsvp-notice--hidden");
          existingNotice.classList.remove("rsvp-notice--hidden");
          submitButtonDefaultText = "Update RSVP";
          submitButton.textContent = submitButtonDefaultText;
          successMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .catch(function (error) {
          errorNotice.textContent = error.message || "Something went wrong submitting your RSVP. Please try again.";
          errorNotice.classList.remove("rsvp-notice--hidden");
          submitButton.textContent = submitButtonDefaultText;
          errorNotice.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .finally(function () {
          submitButton.disabled = false;
        });
    });
  }

  init();
})();