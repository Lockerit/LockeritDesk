import dayjs from "dayjs";

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
        const dow = Number(dayOfWeek) || 0; // asegurar número

        // Domingo de ESTA semana (robusto, independiente del locale)
        const thisWeekSunday = now.startOf("day").subtract(now.day(), "day");

        // Semana PASADA empezando en el dayOfWeek solicitado
        const startDate = thisWeekSunday.subtract(7, "day").add(dow, "day").startOf("day");
        const endDate = startDate.add(6, "day").endOf("day");

        return { startDate, endDate };
    }

    if (frequency === "monthly") {
        const startDate = dayjs(new Date(now.year(), now.month() - 1, dayOfMonth)).startOf("day");
        const endDate = startDate.add(1, "month").subtract(1, "day").endOf("day");
        return { startDate, endDate };
    }

    return {
        startDate: now.startOf("day"),
        endDate: now.endOf("day"),
    };
}
