import dayjs from "dayjs";

/**
 * Calcula el rango de fechas según la frecuencia:
 * - daily   → día anterior completo
 * - weekly  → bloque de 7 días comenzando en el dayOfWeek de la semana anterior
 * - monthly → mes pasado completo desde el dayOfMonth elegido
 */
export function getDateRange(referenceDate, frequency, dayOfWeek = 1, dayOfMonth = 1) {
    const now = dayjs(referenceDate);

    if (frequency === "daily") {
        const day = now.subtract(1, "day");
        return {
            startDate: day.startOf("day"),
            endDate: day.endOf("day"),
        };
    }

    if (frequency === "weekly") {
        const dow = Number(dayOfWeek) || 0; // 0=domingo ... 6=sábado

        // Tomar el día de la semana *anterior* al hoy
        // (ej: si hoy es martes y pido martes → me da el martes pasado)
        let startDate = now.day(dow).startOf("day").subtract(7, "day");

        const endDate = startDate.add(6, "day").endOf("day");

        return { startDate, endDate };
    }

    if (frequency === "monthly") {
        // Mes pasado desde el dayOfMonth
        const prev = now.subtract(1, "month");
        const safeDay = Math.min(Number(dayOfMonth) || 1, prev.daysInMonth());
        const startDate = prev.date(safeDay).startOf("day");
        const endDate = startDate.add(1, "month").subtract(1, "day").endOf("day");

        return { startDate, endDate };
    }

    // fallback: día actual
    return {
        startDate: now.startOf("day"),
        endDate: now.endOf("day"),
    };
}
