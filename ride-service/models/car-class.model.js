import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";

export const CarClass = sequelize.define(
  "car_classes",
  {
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
  },
  {
    timestamps: false,
    tableName: "car_classes",
  }
);
