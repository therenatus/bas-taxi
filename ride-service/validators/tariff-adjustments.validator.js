import { z } from "zod";

/**
 * Схема валидации для запроса обновления часовой корректировки тарифа
 */
export const hourAdjustmentSchema = z
  .object({
    cityId: z
      .number()
      .int()
      .positive({
        message: "ID города должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    carClassId: z
      .number()
      .int()
      .positive({
        message: "ID класса автомобиля должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    hour: z
      .number()
      .int()
      .min(0)
      .max(23, {
        message: "Час должен быть от 0 до 23",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    percent: z
      .number()
      .min(-100)
      .max(500, {
        message: "Процент корректировки должен быть от -100 до 500",
      })
      .or(
        z
          .string()
          .regex(/^-?\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    reason: z
      .string()
      .max(255, {
        message: "Причина изменения не должна превышать 255 символов",
      })
      .optional(),
  })
  .strict();

/**
 * Схема валидации для запроса обновления месячной корректировки тарифа
 */
export const monthAdjustmentSchema = z
  .object({
    cityId: z
      .number()
      .int()
      .positive({
        message: "ID города должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    carClassId: z
      .number()
      .int()
      .positive({
        message: "ID класса автомобиля должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    month: z
      .number()
      .int()
      .min(1)
      .max(12, {
        message: "Месяц должен быть от 1 до 12",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    percent: z
      .number()
      .min(-100)
      .max(500, {
        message: "Процент корректировки должен быть от -100 до 500",
      })
      .or(
        z
          .string()
          .regex(/^-?\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    reason: z
      .string()
      .max(255, {
        message: "Причина изменения не должна превышать 255 символов",
      })
      .optional(),
  })
  .strict();

/**
 * Схема валидации для запроса добавления праздничного дня
 */
export const holidayAdjustmentSchema = z
  .object({
    cityId: z
      .number()
      .int()
      .positive({
        message: "ID города должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    carClassId: z
      .number()
      .int()
      .positive({
        message: "ID класса автомобиля должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    month: z
      .number()
      .int()
      .min(1)
      .max(12, {
        message: "Месяц должен быть от 1 до 12",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    day: z
      .number()
      .int()
      .min(1)
      .max(31, {
        message: "День должен быть от 1 до 31",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    percent: z
      .number()
      .min(-100)
      .max(500, {
        message: "Процент корректировки должен быть от -100 до 500",
      })
      .or(
        z
          .string()
          .regex(/^-?\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    reason: z
      .string()
      .max(255, {
        message: "Причина изменения не должна превышать 255 символов",
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Дополнительная валидация дат
      if (data.month === 2 && data.day > 29) {
        return false;
      }
      if ([4, 6, 9, 11].includes(data.month) && data.day > 30) {
        return false;
      }
      return true;
    },
    {
      message: "Некорректная комбинация месяца и дня",
      path: ["day"],
    }
  );

/**
 * Схема валидации для запроса удаления праздничного дня
 */
export const deleteHolidaySchema = z
  .object({
    cityId: z
      .number()
      .int()
      .positive({
        message: "ID города должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    carClassId: z
      .number()
      .int()
      .positive({
        message: "ID класса автомобиля должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    month: z
      .number()
      .int()
      .min(1)
      .max(12, {
        message: "Месяц должен быть от 1 до 12",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    day: z
      .number()
      .int()
      .min(1)
      .max(31, {
        message: "День должен быть от 1 до 31",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    reason: z
      .string()
      .max(255, {
        message: "Причина изменения не должна превышать 255 символов",
      })
      .optional(),
  })
  .strict();

/**
 * Схема валидации для запроса обновления базового тарифа
 */
export const baseTariffSchema = z
  .object({
    cityId: z
      .number()
      .int()
      .positive({
        message: "ID города должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    carClassId: z
      .number()
      .int()
      .positive({
        message: "ID класса автомобиля должен быть положительным числом",
      })
      .or(
        z
          .string()
          .regex(/^\d+$/)
          .transform((val) => parseInt(val, 10))
      ),

    baseFare: z
      .number()
      .min(0, {
        message: "Базовая стоимость не может быть отрицательной",
      })
      .or(
        z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    costPerKm: z
      .number()
      .min(0, {
        message: "Стоимость за километр не может быть отрицательной",
      })
      .or(
        z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    costPerMinute: z
      .number()
      .min(0, {
        message: "Стоимость за минуту не может быть отрицательной",
      })
      .or(
        z
          .string()
          .regex(/^\d+(\.\d+)?$/)
          .transform((val) => parseFloat(val))
      ),

    reason: z
      .string()
      .max(255, {
        message: "Причина изменения не должна превышать 255 символов",
      })
      .optional(),
  })
  .strict();
