import { DataTypes } from "sequelize";

export async function up(queryInterface) {
  await queryInterface.createTable("cities", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });

  await queryInterface.createTable("car_classes", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });

  await queryInterface.createTable("tariffs", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cities",
        key: "id",
      },
    },
    carClassId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "car_classes",
        key: "id",
      },
    },
    baseFare: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    costPerKm: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    costPerMinute: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    serviceFeePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    monthlyAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    hourlyAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    holidayAdjustments: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.createTable("tariff_histories", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tariffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tariffs",
        key: "id",
      },
    },
    cityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cities",
        key: "id",
      },
    },
    carClassId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "car_classes",
        key: "id",
      },
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    changeReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("tariffs", ["cityId", "carClassId"], {
    unique: true,
    where: {
      isActive: true,
    },
  });

  await queryInterface.addIndex("tariff_histories", ["tariffId"]);
  await queryInterface.addIndex("tariff_histories", ["cityId", "carClassId"]);

  await queryInterface.bulkInsert("cities", [
    { id: 1, name: "Москва" },
    { id: 2, name: "Алматы" },
    { id: 3, name: "Бишкек" },
  ]);

  await queryInterface.bulkInsert("car_classes", [
    { id: 1, name: "Эконом" },
    { id: 2, name: "Комфорт" },
    { id: 3, name: "Бизнес" },
    { id: 4, name: "Премиум" },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("tariff_histories");
  await queryInterface.dropTable("tariffs");
  await queryInterface.dropTable("car_classes");
  await queryInterface.dropTable("cities");
}
