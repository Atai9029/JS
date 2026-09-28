let users = [
    { login: "gigachad", password: "2007", name: "Daniyar" },
    { login: "sii", password: "9029", name: "Overlord" },
    { login: "Ryiken", password: "777", name: "Никто" },
    { login: "ivan", password: "tailer", name: "Иван" },
    { login: "smoker", password: "d1a2n3i4", name: "Данияр" },
    { login: "titan", password: "5090ti", name: "Титан"}
];

function authorize() {
    let login = document.getElementById('login').value;
    let password = document.getElementById('password').value;
    let result = document.getElementById('result');

    let user = users.find((item) => item.login === login && item.password === password);

    if (user) {
        result.textContent = 'Здравствуйте, ' + user.name + '!';
        result.style.color = 'green';
    } else {
        result.textContent = 'Неверный логин или пароль';
        result.style.color = 'red';
    }
}



function sumAll() {
    let sum = 0;

    for (let i = 0; i < arguments.length; i++) {
        sum = sum + arguments[i];
    }
    return sum;
}
console.log(sumAll(22, 33, 44, 55, 66, 77, 88, 99));
console.log(sumAll(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 290));


