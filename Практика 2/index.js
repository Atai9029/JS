//Таблица умножения
let table = Number(prompt('Введите число от 2 до 10:'));

if (table >= 2 && table <= 10) {
    for (let i = 1; i <= 10; i++) {
        document.writeln(table + ' × ' + i + ' = ' + table * i);
    }
} else {
    document.writeln('Число должно быть от 2 до 10!');
}


//Подсчет карт VISA
let cards = ["46782346", "45781218", "79874568", "12157845", "36151845", "41250895", "41201961"];

let countVisa = 0;

for (let i = 0; i < cards.length; i++) {
    if (cards[i][0] === '4') {
        countVisa = countVisa + 1;
    }
}

document.writeln('Карт VISA ' + countVisa + ' из ' + cards.length + '.');


//Система лояльности "Газпром"
let cardType = String(prompt('Введите тип карты: SILVER, GOLD, PLATINUM')).toUpperCase();
let liters = Number(prompt('Введите кол-ВО литров:'));

let points = 0;

if (cardType === 'SILVER') {
    points = liters * 0.5;
} else if (cardType === 'GOLD') {
    points = liters * 0.75;
} else if (cardType === 'PLATINUM') {
    points = liters * 1;
} else {
    document.writeln('Такого типа карты нет!');
}

if (cardType === 'SILVER' || cardType === 'GOLD' || cardType === 'PLATINUM') {
    document.writeln('Вам начислено баллов: ' + points);
}