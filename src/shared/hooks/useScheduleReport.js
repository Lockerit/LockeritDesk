
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect } from "react";

import { getDateRange } from "@shared/utils/getDateRange.js";

dayjs.extend(utc);

const fileName = "scheduleReport";

const log = (level, message) => {
    if (typeof window !== "undefined" && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    } else {
        console[level]?.(`[${fileName}] ${message}`);
    }
};

// Helpers
function getLastExecution(frequency) {
    return localStorage.getItem(`lastExecution_${frequency}`);
}

function getNextTarget(frequency) {
    return localStorage.getItem(`nextTarget_${frequency}`);
}

function setExecutionDates(frequency, hour, minute, dayOfWeek, dayOfMonth) {
    const realExec = dayjs();

    // 🔹 Calcular el próximo target después de esta ejecución
    let nextTarget = realExec.hour(hour).minute(minute).second(0).millisecond(0);

    if (frequency === "daily") {
        nextTarget = nextTarget.add(1, "day");
    }

    if (frequency === "weekly") {
        const diff = (dayOfWeek - realExec.day() + 7) % 7 || 7; // siempre al menos +7
        nextTarget = nextTarget.add(diff, "day");
    }

    if (frequency === "monthly") {
        nextTarget = realExec.add(1, "month").date(dayOfMonth).hour(hour).minute(minute).second(0).millisecond(0);
    }

    localStorage.setItem(`lastExecution_${frequency}`, realExec.format("YYYY-MM-DD HH:mm:ss"));
    localStorage.setItem(`nextTarget_${frequency}`, nextTarget.format("YYYY-MM-DD HH:mm:ss"));

    log(
        "info",
        `Actualizando ejecución → Real: ${realExec.format("YYYY-MM-DD HH:mm:ss")} | Próximo target: ${nextTarget.format("YYYY-MM-DD HH:mm:ss")}`
    );

    return nextTarget;
}

function shouldRunNow(frequency) {
    const lastExec = getLastExecution(frequency);
    const nextTarget = getNextTarget(frequency);
    const now = dayjs();

    log(
        "debug",
        `Ahora: ${now.format("YYYY-MM-DD HH:mm:ss")} | Próximo target: ${nextTarget ?? "N/A"} | Última ejecución: ${lastExec ?? "N/A"}`
    );

    // 🚀 Si no hay registro previo, solo calcular el próximo target SIN ejecutar
    if (!lastExec || !nextTarget) {
        log("debug", "Primera ejecución detectada, disparando tarea inmediatamente");
        return true;
    }

    const targetDate = dayjs(nextTarget, "YYYY-MM-DD HH:mm:ss");
    if (now.isAfter(targetDate)) {
        return true;
    }

    return false;
}

// Hook
export function useSchedulerReport({
    frequency = "daily",
    hour = 0,
    minute = 5,
    dayOfWeek = 1,
    dayOfMonth = 1,
    task,
    enabled = true,
    timeInterval = 60, // 60 segundos
}) {
    useEffect(() => {
        if (!enabled) {
            log("debug", "Scheduler deshabilitado, esperando que se active...");
            return;
        }

        if (typeof task !== "function") {
            log("warn", "Task no definida, no se ejecutará scheduler");
            return;
        }

        async function runTask() {
            try {
                log("debug", `Iniciando tarea programada [${frequency}] a las ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);

                const { startDate, endDate } = getDateRange(dayjs(), frequency, dayOfWeek, dayOfMonth);

                log(
                    "info",
                    `Ejecutando tarea programada [${frequency}] con rango: ${startDate.format(
                        "YYYY-MM-DD"
                    )} → ${endDate.format("YYYY-MM-DD")}`
                );

                await task(startDate, endDate);

                // ✅ Guardar lastExecution y calcular el nuevo nextTarget
                setExecutionDates(frequency, hour, minute, dayOfWeek, dayOfMonth);

                log("info", "Tarea ejecutada correctamente");
            } catch (err) {
                log("error", `Error en tarea programada: ${err.message}`);
            }
        }

        log("debug", `Iniciando scheduler [${frequency}] con hora ${hour}:${minute}`);

        if (shouldRunNow(frequency, hour, minute, dayOfWeek, dayOfMonth)) {
            runTask();
        }

        const interval = setInterval(() => {
            if (shouldRunNow(frequency, hour, minute, dayOfWeek, dayOfMonth)) {
                runTask();
            }
        }, timeInterval * 1000);

        return () => clearInterval(interval);
    }, [frequency, hour, minute, dayOfWeek, dayOfMonth, task, enabled, timeInterval]);
}
