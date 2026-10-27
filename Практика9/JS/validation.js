// регулярные выражения (урок 8): test, \d, \w, +, ?, {n}, флаг i
const fioRegex = /^[А-ЯA-Z][а-яa-z]+ [А-ЯA-Z][а-яa-z]+( [А-ЯA-Z][а-яa-z]+)?$/;
const emailRegex = /^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i;
const phoneRegex = /^\+?\d{10,13}$/;

const fioInput = document.getElementById('fio');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');

// зеленая рамка - верно, красная - неверно
function check(input, regex, value) {
  const ok = regex.test(value);
  input.style.borderColor = ok ? 'green' : 'red';
  return ok;
}

const checkFio = () => check(fioInput, fioRegex, fioInput.value.trim());
const checkEmail = () => check(emailInput, emailRegex, emailInput.value.trim());
// из телефона убираем пробелы, дефисы и скобки
const checkPhone = () => check(phoneInput, phoneRegex, phoneInput.value.replace(/[-()\s]/g, ''));

fioInput.addEventListener('input', checkFio);
emailInput.addEventListener('input', checkEmail);
phoneInput.addEventListener('input', checkPhone);

// если есть ошибка, оплату не пускаем
document.getElementById('payBtn').addEventListener('click', (event) => {
  if ([checkFio(), checkEmail(), checkPhone()].includes(false)) {
    event.stopImmediatePropagation();
    alert('Проверьте ФИО, Email и телефон');
  }
}, true);
