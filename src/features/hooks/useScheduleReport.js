import { useEffect } from "react";
import { getDateRange } from "../utils/getDateRange.js";

const fileName = "scheduleReport";

const log = (level, message) => {
    if (typeof window !== "undefined" && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    } else {
        console[level]?.(`[${fileName}] ${message}`);
    }
};

// Helpers
function getLastExecution() {
    return localStorage.getItem("lastExecution");
}

function setLastExecution(targetDate) {
    localStorage.setItem("lastExecution", targetDate.toISOString());
    log("info", `Actualizando última ejecución al slot: ${targetDate.toLocaleString()}`);
}

function getTargetDate({ frequency, hour, minute, dayOfWeek, dayOfMonth }) {
    const now = new Date();
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

    if (frequency === "daily") {
        if (target <= now) {
            target.setDate(target.getDate() + 1); // mañana
        }
    }

    if (frequency === "weekly") {
        const currentDay = now.getDay(); // 0=domingo
        let diff = dayOfWeek - currentDay;
        if (diff < 0 || (diff === 0 && target <= now)) {
            diff += 7;
        }
        target.setDate(now.getDate() + diff);
    }

    if (frequency === "monthly") {
        target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, minute, 0);
        if (target <= now) {
            target = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hour, minute, 0);
        }
    }

    return target;
}

function shouldRunNow({ frequency, hour, minute, dayOfWeek, dayOfMonth }) {
    const lastExec = getLastExecution();
    const now = new Date();
    const target = getTargetDate({ frequency, hour, minute, dayOfWeek, dayOfMonth });

    if (!lastExec) {
        return { run: true, target };
    }

    const lastExecDate = new Date(lastExec);

    if (now >= target && lastExecDate < target) {
        return { run: true, target };
    }

    return { run: false, target };
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
}) {
    useEffect(() => {
        if (!enabled) {
            log("debug", "Scheduler deshabilitado, esperando que se active...");
            return;
        }

        async function runTask(target) {
            try {
                const { startDate, endDate } = getDateRange(new Date(), frequency, dayOfWeek, dayOfMonth);

                log(
                    "info",
                    `Ejecutando tarea programada [${frequency}] con rango: ${startDate.format(
                        "YYYY-MM-DD"
                    )} → ${endDate.format("YYYY-MM-DD")}`
                );

                await task(startDate, endDate);
                setLastExecution(target); // guardamos el slot exacto
                log("info", "Tarea ejecutada correctamente");
            } catch (err) {
                log("error", `Error en tarea programada: ${err.message}`);
            }
        }

        log("info", `Iniciando scheduler [${frequency}] con hora ${hour}:${minute}`);

        let check = shouldRunNow({ frequency, hour, minute, dayOfWeek, dayOfMonth });
        if (check.run) {
            runTask(check.target);
        }

        const interval = setInterval(() => {
            check = shouldRunNow({ frequency, hour, minute, dayOfWeek, dayOfMonth });
            if (check.run) {
                runTask(check.target);
            }
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [frequency, hour, minute, dayOfWeek, dayOfMonth, task, enabled]);
}
