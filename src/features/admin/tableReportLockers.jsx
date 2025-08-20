import React, { useState, useMemo, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TablePagination, TablePaginationActions,
    TextField, Box, Button,
    Typography
} from "@mui/material";
import dayjs from "dayjs";
import { useWindowSize } from '../hooks/useWindowSize.js';
import { formatCurrency } from "../utils/utils.js";
import GetReportLockers from "../apis/report.js";
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';
import { useElectronConfig } from '../hooks/useConfig.js';


const fileName = 'tableReportLockers';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

const ReportTable = ({ data, startDate, endDate }) => {
    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const { factor } = useWindowSize();
    const scale = factor || 1;
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const config = useElectronConfig();
    const [isErrorMsj, setIsErrorMsj] = useState(true);


    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }
    }, [config])

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // 🔎 Filtrar datos
    const filteredData = data.filter((row) => {
        const query = search.toLowerCase();
        return (
            String(row.LockerCode).toLowerCase().includes(query) ||
            String(row.Phone).toLowerCase().includes(query) ||
            String(row.PIN).toLowerCase().includes(query) ||
            (row.OpenBy || "").toLowerCase().includes(query)
        );
    });

    // Total de todos los datos filtrados
    const totalAmount = useMemo(() => {
        return data.reduce((acc, row) => acc + (Number(row.AmountPaid) || 0), 0);
    }, [data]);

    // Datos de la página actual
    const currentPageData = useMemo(() => {
        return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    // Total de la página actual
    const totalAmountCurrentPage = useMemo(() => {
        return currentPageData.reduce((acc, row) => acc + (Number(row.AmountPaid) || 0), 0);
    }, [currentPageData]);

    const fetchDataReportLocker = async (showMsg = false) => {
        setIsErrorMsj(true);
        setLoading(true);

        const payload = {
            startDate: dayjs(startDate).format("YYYY-MM-DD HH:mm:ss"),
            endDate: dayjs(endDate).format("YYYY-MM-DD HH:mm:ss"),
            sendMail: true
        };

        if (filteredData.length === 0) {
            setLoading(false);
            const msg = 'No se encontraron resultados para enviar';
            log('info', msg);
            setMessageErrorAPI(msg);
            setShowErrorAPIOpen(true);
            setIsErrorMsj(true);
            return;
        }

        try {
            const result = await GetReportLockers(payload);

            if (result?.success) {

                if (showMsg) {

                    let msg = '';

                    if (!result?.data) {
                        msg = 'No se encontraron resultados para enviar';
                        setIsErrorMsj(true);
                    } else {
                        msg = 'Reporte enviado con éxito';
                        setIsErrorMsj(false);
                    }
                    log('info', msg);
                    setMessageErrorAPI(msg);;
                    setShowErrorAPIOpen(true);
                } else {
                    setShowErrorAPIOpen(false);
                }
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : result?.data?.message || 'Error al obtener reporte';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);
            }
        } catch (err) {
            setMessageErrorAPI(err.message || 'Error al obtener reporte');
            setShowErrorAPIOpen(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {/* 🔹 Barra búsqueda */}
                <Box
                    sx={{
                        flex: "0 0 auto",   // alto dinámico (no fijo en %)
                        display: "flex",
                        gap: 3 * scale,
                        alignItems: "flex-end",
                        p: 2 * scale,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            label="Buscar..."
                            variant="standard"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{
                                height: `${48 * scale}px`,
                                fontSize: `${16 * scale}px`,
                                fontWeight: 'normal',
                            }}
                            onClick={() => fetchDataReportLocker(true)}
                        >
                            Enviar reporte
                        </Button>
                    </Box>
                </Box>


                {/* 🔹 Contenedor tabla */}
                <Paper
                    sx={{
                        width: "100%",
                        flex: 1,             // ocupa todo lo que queda
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,        // 🔑 deja crecer hasta el padre
                    }}
                >
                    <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                        <Table stickyHeader size="small" sx={{ minWidth: 900 * scale }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Registro</TableCell>
                                    <TableCell>Id Casillero</TableCell>
                                    <TableCell>Casillero</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>PIN</TableCell>
                                    <TableCell>Activo</TableCell>
                                    <TableCell>Fecha Asignación</TableCell>
                                    <TableCell>Fecha Retiro</TableCell>
                                    <TableCell>Valor Pagado</TableCell>
                                    <TableCell>Abierto por</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((row) => (
                                        <TableRow key={row.ID}>
                                            <TableCell>{row.ID}</TableCell>
                                            <TableCell>{row.LockerID}</TableCell>
                                            <TableCell>{row.LockerCode}</TableCell>
                                            <TableCell>{row.Phone}</TableCell>
                                            <TableCell>{row.PIN}</TableCell>
                                            <TableCell>{row.Active ? "Sí" : "No"}</TableCell>
                                            <TableCell>
                                                {row.StartTime ? dayjs(row.StartTime).format("DD/MM/YYYY HH:mm:ss") : ""}
                                            </TableCell>
                                            <TableCell>
                                                {row.EndTime ? dayjs(row.EndTime).format("DD/MM/YYYY HH:mm:ss") : ""}
                                            </TableCell>
                                            <TableCell>{formatCurrency(row.AmountPaid)}</TableCell>
                                            <TableCell>
                                                {row.OpenBy || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Totales + paginación */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" px={5 * scale}>
                        {/* Totales alineados a la izquierda */}
                        <Box fontWeight="bold">
                            Total Reporte: {formatCurrency(totalAmount)}
                        </Box>
                        <Box fontWeight="bold">
                            Total Página: {formatCurrency(totalAmountCurrentPage)}
                        </Box>

                        {/* Paginación alineada a la derecha */}
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 20, 50]}
                            component="div"
                            count={filteredData.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Filas por página"
                            labelDisplayedRows={({ from, to, count }) => `${from} a ${to} de ${count}`}
                        />
                    </Box>
                </Paper>
            </Box>

            {loading && <LoadingScreen message={'Enviando...'} />}

            {showErrorAPIOpen && (
                <ShowErrorAPI
                    open={showErrorAPIOpen}
                    onConfirm={() => setShowErrorAPIOpen(false)}
                    msg={messageErrorAPI}
                    timeout={timeoutShowMessage}
                    isError={isErrorMsj}
                    disableEnforceFocus
                    disableAutoFocus
                    disableRestoreFocus
                />
            )}
        </>
    );
};

export default ReportTable;
