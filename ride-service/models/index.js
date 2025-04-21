import { CarClass } from "./car-class.model.js";
import City from "./city.model.js";
import TariffHistory from "./tariff-history.model.js";
import Tariff from "./tarrif.model.js";

const initModels = () => {
  City.hasMany(Tariff, { foreignKey: "cityId" });
  Tariff.belongsTo(City, { foreignKey: "cityId" });

  CarClass.hasMany(Tariff, { foreignKey: "carClassId" });
  Tariff.belongsTo(CarClass, { foreignKey: "carClassId" });

  Tariff.hasMany(TariffHistory, { foreignKey: "tariffId" });
  TariffHistory.belongsTo(Tariff, { foreignKey: "tariffId" });

  City.hasMany(TariffHistory, { foreignKey: "cityId" });
  TariffHistory.belongsTo(City, { foreignKey: "cityId" });

  CarClass.hasMany(TariffHistory, { foreignKey: "carClassId" });
  TariffHistory.belongsTo(CarClass, { foreignKey: "carClassId" });
};

export { CarClass, City, initModels, Tariff, TariffHistory };
