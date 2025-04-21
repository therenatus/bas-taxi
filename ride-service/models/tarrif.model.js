import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import TariffHistory from "./tariff-history.model.js";

const Tariff = sequelize.define(
  "Tariff",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cityId: { type: DataTypes.INTEGER, allowNull: false },
    carClassId: { type: DataTypes.INTEGER, allowNull: false },
    baseFare: { type: DataTypes.FLOAT, allowNull: false },
    costPerKm: { type: DataTypes.FLOAT, allowNull: false },
    costPerMinute: { type: DataTypes.FLOAT, allowNull: false },
    serviceFeePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    monthlyAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [
        { month: 1, percent: 15 }, // Январь: +15% к costPerKm (зимний сезон)
        { month: 2, percent: 10 }, // Февраль: +10% к costPerKm
        { month: 6, percent: 5 }, // Июнь: +5% к costPerKm (летний сезон)
        { month: 7, percent: 5 }, // Июль: +5% к costPerKm
        { month: 8, percent: 5 }, // Август: +5% к costPerKm
        { month: 12, percent: 15 }, // Декабрь: +15% к costPerKm (новогодний сезон)
      ],
      comment:
        "Корректировки costPerKm по месяцам в процентах (положительные - наценка, отрицательные - скидка)",
    },
    hourlyAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [
        { hour: 8, percent: 20 }, // 8:00-8:59: +20% к costPerKm
        { hour: 9, percent: 20 }, // 9:00-9:59: +20% к costPerKm
        { hour: 10, percent: -10 }, // 10:00-10:59: -10% к costPerKm
        { hour: 17, percent: 20 }, // 17:00-17:59: +20% к costPerKm
        { hour: 18, percent: 20 }, // 18:00-18:59: +20% к costPerKm
      ],
      comment:
        "Корректировки costPerKm по часам в процентах (положительные - наценка, отрицательные - скидка)",
    },
    holidayAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [
        { month: 3, day: 8, percent: 30 }, // 8 марта: +30% к costPerKm
        { month: 1, day: 1, percent: 30 }, // Новый год: +30% к costPerKm
        { month: 5, day: 1, percent: 30 }, // Первомай: +30% к costPerKm
        { month: 5, day: 9, percent: 30 }, // День Победы: +30% к costPerKm
      ],
      comment: "Праздничные дни с процентом наценки к costPerKm",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "tariffs",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["cityId", "carClassId"],
        where: {
          isActive: true,
        },
      },
    ],
    hooks: {
      afterUpdate: async (tariff) => {
        await TariffHistory.create({
          tariffId: tariff.id,
          cityId: tariff.cityId,
          carClassId: tariff.carClassId,
          oldValues: JSON.stringify(tariff._previousDataValues),
          newValues: JSON.stringify(tariff.dataValues),
        });
      },
    },
  }
);

export default Tariff;
