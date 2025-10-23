function validateForm(event) {
  const userAnswer = parseInt(document.getElementById('humanAnswer').value);
  const correctAnswer = parseInt(document.getElementById('correctAnswer').value);
  const captchaResponse = grecaptcha.getResponse();

  // Clear previous error message
  const errorMsgDiv = document.getElementById('errorMessage');
  const errorMsgText = document.getElementById('errorMessageText');
  errorMsgDiv.style.display = 'none';
  errorMsgText.textContent = '';

  // Check math answer
  if (userAnswer !== correctAnswer) {
    event.preventDefault();
    errorMsgText.textContent = 'Incorrect math answer. Please try again.';
    errorMsgDiv.style.display = 'block';
    return false;
  }

  // Check reCAPTCHA - TEMPORARILY COMMENTED OUT
  // if (!captchaResponse) {
  //   event.preventDefault();
  //   errorMsgText.textContent = 'Please complete the reCAPTCHA.';
  //   errorMsgDiv.style.display = 'block';
  //   return false;
  // }

  // Both passed - allow form submission
  return true;
}


// Fetch math question when page loads
window.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('/math-question');
      const data = await res.json();


      // Show question on the page
      document.getElementById('math-question').innerText = `${data.a} + ${data.b}`;


      // Store the correct result in hidden field
      document.getElementById('correctAnswer').value = data.result;
    } catch (error) {
      console.error('Failed to fetch math question', error);
    }
  });


     function togglePasswordVisibility() {
    const pwd = document.getElementById('password');
    const icon = document.getElementById('toggleIcon');
    if (pwd.type === 'password') {
      pwd.type = 'text';
      icon.classList.remove('bi-eye-slash-fill');
      icon.classList.add('bi-eye-fill');
    } else {
      pwd.type = 'password';
      icon.classList.remove('bi-eye-fill');
      icon.classList.add('bi-eye-slash-fill');
    }
  }
