import { Sequelize } from 'sequelize';

export async function up(queryInterface) {
    // Создаем базовые классы автомобилей
    await queryInterface.bulkInsert('car_classes', [
        {
            id: 1,
            name: 'Эконом'
        },
        {
            id: 2,
            name: 'Комфорт'
        },
        {
            id: 3,
            name: 'Бизнес'
        },
        {
            id: 4,
            name: 'Премиум'
        }
    ], {});
}

export async function down(queryInterface) {
    await queryInterface.bulkDelete('car_classes', null, {});
} 