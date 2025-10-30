import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect } from "react";
import { getDateRange } from "@shared/utils/getDateRange.js";

dayjs.extend(utc);

// ===== Logger seguro =====
const LOG_SCOPE = "scheduleReport";
const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (() => {
    if (typeof window !== "undefined" && window.electronAPI?.log) {
        const send = (level, msg, meta) => window.electronAPI.log(level, `[${LOG_SCOPE}] ${msg}`, meta);
        return {
            info: (m, meta) => send("info", m, meta),
            warn: (m, meta) => send("warn", m, meta),
            error: (m, meta) => send("error", m, meta),
            debug: (m, meta) => send("debug", m, meta),
        };
    }
    try {
        return {
            info: (m, meta) => console.info(`[${LOG_SCOPE}]`, m, meta ?? ""),
            warn: (m, meta) => console.warn(`[${LOG_SCOPE}]`, m, meta ?? ""),
            error: (m, meta) => console.error(`[${LOG_SCOPE}]`, m, meta ?? ""),
            debug: (m, meta) => console.debug(`[${LOG_SCOPE}]`, m, meta ?? ""),
        };
    } catch { return NOOP; }
})();

// ===== Helpers de persistencia =====
const lastKey = (f) => `lastExecution_${f}`;
const nextKey = (f) => `nextTarget_${f}`;

function getLastExecution(frequency) {
    return localStorage.getItem(lastKey(frequency));
}
function getNextTarget(frequency) {
    return localStorage.getItem(nextKey(frequency));
}

// Calcula el siguiente target estrictamente posterior a "now"
function computeNextTarget({ frequency, hour, minute, dayOfWeek, dayOfMonth, now = dayjs() }) {
    const atTime = (d) => d.hour(hour).minute(minute).second(0).millisecond(0);

    if (frequency === "daily") {
        let t = atTime(now);
        if (!t.isAfter(now)) t = t.add(1, "day");
        return t;
    }

    if (frequency === "weekly") {
        // dayOfWeek: 0=Dom, 1=Lun, ... 6=Sáb
        let t = atTime(now.day(dayOfWeek));
        // si caer hoy y ya pasó la hora, o si la normalización lo dejó en el pasado, sumar 7
        if (!t.isAfter(now)) t = t.add(7, "day");
        return t;
    }

    if (frequency === "monthly") {
        // Ajusta el día del mes al rango válido
        const daysInMonth = now.daysInMonth();
        const dom = Math.min(Math.max(1, dayOfMonth || 1), daysInMonth);
        let t = atTime(now.date(dom));
        if (!t.isAfter(now)) {
            const n = now.add(1, "month");
            const safeDom = Math.min(dom, n.daysInMonth());
            t = atTime(n.date(safeDom));
        }
        return t;
    }

    // Fallback: daily
    let t = atTime(now);
    if (!t.isAfter(now)) t = t.add(1, "day");
    return t;
}

// Guarda lastExecution y calcula/guarda nextTarget
function setExecutionDates(frequency, hour, minute, dayOfWeek, dayOfMonth) {
    const realExec = dayjs();
    const nextTarget = computeNextTarget({ frequency, hour, minute, dayOfWeek, dayOfMonth, now: realExec });

    localStorage.setItem(lastKey(frequency), realExec.format("YYYY-MM-DD HH:mm:ss"));
    localStorage.setItem(nextKey(frequency), nextTarget.format("YYYY-MM-DD HH:mm:ss"));

    log.info(`Ejecución registrada. Próximo target: ${nextTarget.format("YYYY-MM-DD HH:mm:ss")}`);
    return nextTarget;
}

// Regla para decidir si ejecutar ahora
function shouldRunNow(frequency) {
    const lastExec = getLastExecution(frequency);
    const nextT = getNextTarget(frequency);
    const now = dayjs();

    log.debug(
        `now=${now.format("YYYY-MM-DD HH:mm:ss")} next=${nextT ?? "N/A"} last=${lastExec ?? "N/A"}`
    );

    // Si no hay registro previo, ejecutar inmediatamente
    if (!lastExec || !nextT) return true;

    const targetDate = dayjs(nextT, "YYYY-MM-DD HH:mm:ss");
    return now.isAfter(targetDate);
}

// ===== Hook =====
export function useSchedulerReport({
    frequency = "daily",   // "daily" | "weekly" | "monthly"
    hour = 0,
    minute = 5,
    dayOfWeek = 1,         // Lunes
    dayOfMonth = 1,        // Día 1 del mes
    task,
    enabled = true,
    timeInterval = 60,     // segundos
}) {
    useEffect(() => {
        if (!enabled) {
            log.debug("Scheduler deshabilitado");
            return;
        }
        if (typeof task !== "function") {
            log.warn("Task no definida. Scheduler no se ejecutará");
            return;
        }

        async function runTask() {
            try {
                log.debug(`Disparando tarea [${frequency}]`);
                const { startDate, endDate } = getDateRange(dayjs(), frequency, dayOfWeek, dayOfMonth);
                log.info(`Rango: ${startDate.format("YYYY-MM-DD")} → ${endDate.format("YYYY-MM-DD")}`);

                await task(startDate, endDate);

                // Registrar ejecución y programar el próximo target
                setExecutionDates(frequency, hour, minute, dayOfWeek, dayOfMonth);
                log.info("Tarea completada");
            } catch (err) {
                log.error(`Error en tarea: ${err?.message || String(err)}`);
            }
        }

        log.debug(`Iniciando scheduler [${frequency}] ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);

        if (shouldRunNow(frequency)) {
            runTask();
        }

        const id = setInterval(() => {
            if (shouldRunNow(frequency)) {
                runTask();
            }
        }, timeInterval * 1000);

        return () => clearInterval(id);
    }, [frequency, hour, minute, dayOfWeek, dayOfMonth, task, enabled, timeInterval]);
}
