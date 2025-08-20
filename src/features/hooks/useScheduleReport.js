import { useEffect } from "react";
import { getDateRange } from "../utils/getDateRange.js";
import dayjs from "dayjs";

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

function setExecutionDates(targetDate) {
    const realExec = dayjs();

    localStorage.setItem("lastExecution", realExec.format("YYYY-MM-DD HH:mm:ss")); // ⏱ real execution
    localStorage.setItem("nextTarget", targetDate.format("YYYY-MM-DD HH:mm:ss"));  // 🎯 scheduled slot

    log(
        "info",
        `Actualizando ejecución → Real: ${realExec.format("YYYY-MM-DD HH:mm:ss")} | Target: ${targetDate.format("YYYY-MM-DD HH:mm:ss")}`
    );
}

function getTargetDate({ frequency, hour, minute, dayOfWeek, dayOfMonth }) {
    const now = dayjs();
    let target = now.hour(hour).minute(minute).second(0).millisecond(0);

    if (frequency === "daily") {
        if (target.isBefore(now)) {
            target = target.add(1, "day"); // mañana
        }
    }

    if (frequency === "weekly") {
        const diff = (dayOfWeek - now.day() + 7) % 7;
        target = target.add(diff === 0 && target.isBefore(now) ? 7 : diff, "day");
    }

    if (frequency === "monthly") {
        target = now.date(dayOfMonth).hour(hour).minute(minute).second(0).millisecond(0);
        if (target.isBefore(now)) {
            target = target.add(1, "month").date(dayOfMonth);
        }
    }

    return target;
}

function shouldRunNow({ frequency, hour, minute, dayOfWeek, dayOfMonth }) {
    const lastExec = getLastExecution();
    const now = dayjs();
    const target = getTargetDate({ frequency, hour, minute, dayOfWeek, dayOfMonth });

    log(
        "debug",
        `Ahora: ${now.format("YYYY-MM-DD HH:mm:ss")} | Próximo target: ${target.format("YYYY-MM-DD HH:mm:ss")} | Última ejecución: ${lastExec ?? "N/A"}`
    );

    // 🚀 Primera ejecución → dispara inmediatamente
    if (!lastExec) {
        log("debug", "Primera ejecución detectada, disparando tarea inmediatamente");
        return { run: true, target };
    }

    const lastExecDate = dayjs(lastExec, "YYYY-MM-DD HH:mm:ss");

    // Si ya pasó el target y no hemos corrido todavía en este slot → correr
    if (now.isAfter(target) && lastExecDate.isBefore(target)) {
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

        if (typeof task !== "function") {
            log("warn", "Task no definida, no se ejecutará scheduler");
            return;
        }

        async function runTask(target) {
            try {
                log("debug", `Iniciando tarea programada dayjs [${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`);
                log("debug", `Iniciando tarea programada frecuencia [${frequency}]`);
                log("debug", `Iniciando tarea programada semana [${dayOfWeek}]`);
                log("debug", `Iniciando tarea programada mes [${dayOfMonth}]`);

                const { startDate, endDate } = getDateRange(dayjs(), frequency, dayOfWeek, dayOfMonth);

                log(
                    "info",
                    `Ejecutando tarea programada [${frequency}] con rango: ${startDate.format(
                        "YYYY-MM-DD"
                    )} → ${endDate.format("YYYY-MM-DD")}`
                );

                await task(startDate, endDate);

                // ✅ Solo aquí se guardan lastExecution y lastTarget
                setExecutionDates(target);
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
