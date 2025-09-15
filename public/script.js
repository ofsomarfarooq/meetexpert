// Toggle dropdown menu
document.addEventListener("DOMContentLoaded", () => {
  const avatarBtn = document.querySelector(".avatar-btn");
  const dropdown = document.querySelector(".dropdown-content");

  if (avatarBtn) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("show");
    });
  }
});
