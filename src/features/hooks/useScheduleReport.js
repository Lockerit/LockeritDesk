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
    log("debug", `Calculando fecha objetivo para: ${JSON.stringify({ frequency, hour, minute, dayOfWeek, dayOfMonth })}`);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    log("debug", `Fecha objetivo inicial: ${target.toLocaleString()}`);

    if (frequency === "weekly") {
        target.setDate(now.getDate() - now.getDay() + dayOfWeek);
        log("debug", `Fecha objetivo ajustada (semanal): ${target.toLocaleString()}`);
    }

    if (frequency === "monthly") {
        target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, minute, 0);
        log("debug", `Fecha objetivo ajustada (mensual): ${target.toLocaleString()}`);
    }

    return target;
}

function shouldRunNow({ frequency, hour, minute, dayOfWeek, dayOfMonth }) {
    const lastExec = getLastExecution();
    const now = new Date();
    const target = getTargetDate({ frequency, hour, minute, dayOfWeek, dayOfMonth });

    log(
        "debug",
        `Ahora: ${now.toLocaleString()} | Target: ${target.toISOString()} | Última ejecución: ${lastExec ? new Date(lastExec).toLocaleString() : "N/A"
        }`
    );

    // 🚀 Primera ejecución → dispara inmediatamente
    if (!lastExec) {
        log("debug", "Primera ejecución detectada, disparando tarea inmediatamente");
        return { run: true, target };
    }

    const lastExecDate = new Date(lastExec);

    if (frequency === "daily") {
        if (now >= target && lastExecDate < target) {
            return { run: true, target };
        }
    }

    if (frequency === "weekly") {
        log("debug", `Última ejecución (semanal): ${lastExecDate.toLocaleString()} | Target: ${target.toLocaleString()}`);
        if (now >= target && (lastExecDate < target || lastExecDate.getDay() !== dayOfWeek)) {
            log("debug", "Condiciones para ejecución semanal cumplidas");
            return { run: true, target };
        }
    }

    if (frequency === "monthly") {
        if (
            now >= target &&
            (lastExecDate < target ||
                lastExecDate.getDate() !== dayOfMonth ||
                lastExecDate.getMonth() !== now.getMonth())
        ) {
            return { run: true, target };
        }
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
