document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const donationForm = document.getElementById("donation-form");
  const donationMessageDiv = document.getElementById("donation-message");
  const donationAmountInput = document.getElementById("donation-amount");
  const amountButtons = document.querySelectorAll(".amount-btn");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML
        let participantsHTML = '<div class="participants"><h5>Participants</h5>';
        if (details.participants.length > 0) {
          participantsHTML += '<ul>';
          details.participants.forEach(email => {
            participantsHTML += `<li>${email}<button class="delete-btn" data-activity="${name}" data-email="${email}" title="Remove participant">🗑️</button></li>`;
          });
          participantsHTML += '</ul>';
        } else {
          participantsHTML += '<p class="no-participants">No participants yet. Be the first to sign up!</p>';
        }
        participantsHTML += '</div>';

        activityCard.innerHTML = `
          ${details.image ? `<img src="${details.image}" alt="${name}" class="activity-image">` : ''}
          <div class="activity-content">
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Render calendar view
      renderCalendar(activities);
      
      // Update statistics
      updateStatistics(activities);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to render calendar view
  function renderCalendar(activities) {
    const calendar = document.getElementById("calendar");
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    // Parse activities by day
    const activitiesByDay = {};
    days.forEach(day => activitiesByDay[day] = []);
    
    Object.entries(activities).forEach(([name, details]) => {
      const schedule = details.schedule.toLowerCase();
      days.forEach(day => {
        if (schedule.includes(day.toLowerCase())) {
          activitiesByDay[day].push({
            name,
            schedule: details.schedule,
            participants: details.participants.length,
            max_participants: details.max_participants,
            image: details.image
          });
        }
      });
    });
    
    // Build calendar HTML
    let calendarHTML = '<div class="calendar-grid">';
    days.forEach(day => {
      calendarHTML += `
        <div class="calendar-day">
          <h4 class="day-header">${day}</h4>
          <div class="day-activities">
      `;
      
      if (activitiesByDay[day].length > 0) {
        activitiesByDay[day].forEach(activity => {
          calendarHTML += `
            <div class="calendar-activity">
              ${activity.image ? `<img src="${activity.image}" alt="${activity.name}" class="calendar-activity-image">` : ''}
              <div class="calendar-activity-info">
                <strong>${activity.name}</strong>
                <small>${activity.participants}/${activity.max_participants} enrolled</small>
              </div>
            </div>
          `;
        });
      } else {
        calendarHTML += '<p class="no-activities">No activities scheduled</p>';
      }
      
      calendarHTML += `
          </div>
        </div>
      `;
    });
    calendarHTML += '</div>';
    
    calendar.innerHTML = calendarHTML;
  }

  // Function to update statistics
  function updateStatistics(activities) {
    let totalStudents = 0;
    let totalSpots = 0;
    
    Object.values(activities).forEach(activity => {
      totalStudents += activity.participants.length;
      totalSpots += activity.max_participants;
    });
    
    const availableSpots = totalSpots - totalStudents;
    
    animateNumber('total-students', totalStudents);
    animateNumber('available-spots', availableSpots);
  }

  // Function to animate numbers
  function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const startValue = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  // Function to fetch and update donation stats
  async function fetchDonationStats() {
    try {
      const response = await fetch("/donations/stats");
      const stats = await response.json();
      
      document.getElementById("total-donations").textContent = `$${stats.total_amount.toFixed(2)}`;
      document.getElementById("donor-count").textContent = stats.donor_count;
    } catch (error) {
      console.error("Error fetching donation stats:", error);
    }
  }

  // Handle donation amount button clicks
  amountButtons.forEach(button => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      amountButtons.forEach(btn => btn.classList.remove("active"));
      
      // Add active class to clicked button
      button.classList.add("active");
      
      const amount = button.dataset.amount;
      if (amount === "custom") {
        donationAmountInput.value = "";
        donationAmountInput.focus();
      } else {
        donationAmountInput.value = amount;
      }
    });
  });

  // Handle donation form submission
  donationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const amount = parseFloat(document.getElementById("donation-amount").value);
    const name = document.getElementById("donor-name").value;
    const email = document.getElementById("donor-email").value;
    const message = document.getElementById("donation-message").value;

    try {
      const response = await fetch(
        `/donations?amount=${amount}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&message=${encodeURIComponent(message)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        donationMessageDiv.textContent = result.message;
        donationMessageDiv.className = "success";
        donationForm.reset();
        amountButtons.forEach(btn => btn.classList.remove("active"));
        
        // Refresh donation stats
        await fetchDonationStats();
      } else {
        donationMessageDiv.textContent = result.detail || "An error occurred";
        donationMessageDiv.className = "error";
      }

      donationMessageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        donationMessageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      donationMessageDiv.textContent = "Failed to process donation. Please try again.";
      donationMessageDiv.className = "error";
      donationMessageDiv.classList.remove("hidden");
      console.error("Error processing donation:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Refresh the activities list
        await fetchActivities();
        
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle delete button clicks
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const activity = event.target.dataset.activity;
      const email = event.target.dataset.email;

      if (confirm(`Are you sure you want to unregister ${email} from ${activity}?`)) {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
            {
              method: "DELETE",
            }
          );

          const result = await response.json();

          if (response.ok) {
            // Refresh the activities list
            await fetchActivities();
            
            messageDiv.textContent = result.message;
            messageDiv.className = "success";
            messageDiv.classList.remove("hidden");

            // Hide message after 3 seconds
            setTimeout(() => {
              messageDiv.classList.add("hidden");
            }, 3000);
          } else {
            messageDiv.textContent = result.detail || "Failed to unregister";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
          }
        } catch (error) {
          messageDiv.textContent = "Failed to unregister. Please try again.";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
          console.error("Error unregistering:", error);
        }
      }
    }
  });

  // Initialize app
  fetchActivities();
  fetchDonationStats();
});
