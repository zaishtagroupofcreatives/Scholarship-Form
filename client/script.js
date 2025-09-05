document.addEventListener("DOMContentLoaded", () => {
  // Initialize floating labels
  function initFloatingLabels() {
    document
      .querySelectorAll(
        ".form-group input, .form-group select, .form-group textarea"
      )
      .forEach((el) => {
        if (
          (el.tagName === "INPUT" && el.value !== "") ||
          (el.tagName === "SELECT" && el.value !== "") ||
          (el.tagName === "TEXTAREA" && el.value !== "")
        ) {
          const label = el.nextElementSibling;
          label.style.top = "0";
          label.style.left = "0.75rem";
          label.style.fontSize = "0.75rem";
          label.style.background = "white";
          label.style.padding = "0 0.25rem";
          label.style.color = "#4f46e5";
        }
      });
  }

  initFloatingLabels();

  // Add focus/blur events for floating labels
  document
    .querySelectorAll(
      ".form-group input, .form-group select, .form-group textarea"
    )
    .forEach((el) => {
      el.addEventListener("focus", function () {
        const label = this.nextElementSibling;
        label.style.top = "0";
        label.style.left = "0.75rem";
        label.style.fontSize = "0.75rem";
        label.style.background = "white";
        label.style.padding = "0 0.25rem";
        label.style.color = "#4f46e5";
      });

      el.addEventListener("blur", function () {
        if (this.value === "") {
          const label = this.nextElementSibling;
          label.style.top = "50%";
          label.style.left = "1rem";
          label.style.fontSize = "1rem";
          label.style.background = "transparent";
          label.style.padding = "0";
          label.style.color = "#64748b";
        }
      });
    });

  // File preview setup
  function setupFilePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 200 * 1024) {
          alert(`File ${file.name} exceeds 200KB limit.`);
          input.value = "";
          return;
        }
        if (!file.type.startsWith("image/")) {
          alert(`File ${file.name} must be an image.`);
          input.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          preview.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Set up previews for all file inputs
  [
    { input: "profileImage", preview: "profilePreview" },
    { input: "cnicFront", preview: "cnicFrontPreview" },
    { input: "cnicBack", preview: "cnicBackPreview" },
    { input: "matricCert", preview: "matricPreview" },
    { input: "interCert", preview: "intermediatePreview" },
    { input: "domicileDoc", preview: "domicilePreview" },
  ].forEach(({ input, preview }) => setupFilePreview(input, preview));

  // Make upload areas clickable
  document.querySelectorAll(".upload-area").forEach((area) => {
    area.addEventListener("click", () => {
      const input = area.querySelector('input[type="file"]');
      if (input) input.click();
    });
  });

  // Same as mailing address
  const sameAsMailing = document.getElementById("sameAsMailing");
  const permanentAddressFields = document.getElementById(
    "permanentAddressFields"
  );
  if (sameAsMailing && permanentAddressFields) {
    sameAsMailing.addEventListener("change", function () {
      const fields = ["Country", "Province", "District", "City", "FullAddress"];
      if (this.checked) {
        permanentAddressFields.style.display = "none";
        fields.forEach((field) => {
          const permanentField = document.getElementById(`permanent${field}`);
          const mailingField = document.getElementById(`mailing${field}`);
          if (permanentField && mailingField) {
            permanentField.value = mailingField.value;
          }
        });
      } else {
        permanentAddressFields.style.display = "block";
      }
    });
  }

  // Form submission
  const form = document.getElementById("scholarshipForm");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const cnic = document.getElementById("cnic")?.value;
      const email = document.getElementById("email")?.value;

      // Client-side validation
      if (!cnic || !/^\d{13}$/.test(cnic)) {
        alert("CNIC must be 13 digits without spaces or dashes.");
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      const formData = new FormData(event.target);
      try {
        console.log("Sending POST to "//scholarship-form-4.onrender.com/submit");
        const response = await fetch("https://scholarship-form-4.onrender.com/submit", {
          method: "POST",
          body: formData,
        });
        const responseText = await response.text();
        console.log("Raw response:", responseText);
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
        if (response.ok) {
          alert(`${result.message}\nStudent ID: ${result.studentId}`);
          event.target.reset();
          initFloatingLabels();
          document.querySelectorAll(".upload-area img").forEach((img) => {
            img.src = img.src.includes("150x150")
              ? "https://placehold.co/150x150?text=Upload+Photo"
              : "https://placehold.co/300x200?text=Upload+Document";
          });
        } else {
          alert(result.message || "Error submitting form");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        alert(`Error submitting form: ${error.message}. Please ensure your backend is reachable.`);
      }
    });
  } else {
    console.error("Form with ID 'scholarshipForm' not found.");
  }

  const fillFormButton = document.getElementById("fillFormButton");
  if (fillFormButton) {
    fillFormButton.addEventListener("click", () => {
      const fieldsToFill = {
        nationality: "Pakistani",
        province: "Punjab",
        institute: "Test University",
        cnic: "1234567890123",
        email: "test.user@example.com",
        password: "password123",
        confirmPassword: "password123",
        firstName: "Test",
        middleName: "Q",
        lastName: "User",
        guardianName: "Test Guardian",
        gender: "Male",
        religion: "Islam",
        homePhone: "04212345678",
        mobile: "03001234567",
        fatherStatus: "Alive",
        motherStatus: "Alive",
        instituteType: "University",
        subCampus: "Main Campus",
        admissionDate: "2023-10-01",
        dob: "2002-05-15",
        domicile: "Punjab",
        sscProgramTitle: "Matriculation",
        sscInstitute: "Test High School",
        sscDiscipline: "Science",
        sscObtainedMarks: "950",
        sscTotalMarks: "1100",
        hscProgramTitle: "Intermediate",
        hscInstitute: "Test College",
        hscDiscipline: "Science",
        hscObtainedMarks: "980",
        hscTotalMarks: "1100",
        programDiscipline: "Computer Science",
        degreeTitle: "Bachelor",
        familyIncome: "40,000 - 60,000 PKR",
        passportNo: "AB1234567",
        dualNationality: "No",
        mailingCountry: "Pakistan",
        mailingProvince: "Punjab",
        mailingDistrict: "Lahore",
        mailingCity: "Lahore",
        mailingFullAddress: "123 Test Street, Lahore",
      };

      for (const id in fieldsToFill) {
        const element = document.getElementById(id);
        if (element) {
          element.value = fieldsToFill[id];
          // Trigger focus and blur to activate floating label correctly
          element.dispatchEvent(new Event("focus"));
          element.dispatchEvent(new Event("blur"));
        }
      }
    });
  }
});
