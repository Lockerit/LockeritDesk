import { useState, useMemo, useEffect } from "react";


import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Box, Button, IconButton, InputAdornment, TableSortLabel
} from "@mui/material";
import {
    ManageSearch, ForwardToInbox
} from '@mui/icons-material';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { formatCurrency } from "@shared/utils/utils.js";
import { GetReportLockers } from "@services/apis/report.js";
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { TextFieldVirtKeyPad } from "@shared/components/inputs/TextFieldVirtKeyPad.jsx";

dayjs.extend(utc);

export const TableReportLockers = ({ data, startDate, endDate }) => {

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const size = useWindowSizeContext();
    const scale = size.factor || 1;
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const config = useElectronConfig();
    const [isErrorMsj, setIsErrorMsj] = useState(true);
    const [disabledButton, setDisabledButton] = useState(true);
    let formatter = (d) => dayjs(d); // por defecto local
    const [orderBy, setOrderBy] = useState("ID");   // campo por defecto
    const [order, setOrder] = useState("asc");      // asc | desc


    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

        let timezoneMode = config?.report?.timezoneMode || "local";

        formatter = timezoneMode === "utc"
            ? (d) => dayjs(d).utc()
            : (d) => dayjs(d);

    }, [config])

    useEffect(() => {
        if (filteredData.length === 0) {
            setDisabledButton(true);
            return;
        }

        setDisabledButton(false);
    }, [data]);

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // 🔹 Manejar cambio de orden
    const handleSort = (field) => {
        const isAsc = orderBy === field && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(field);
    };

    // 🔎 Filtrar datos
    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const query = search.toLowerCase();
            return (
                String(row.LockerCode).toLowerCase().includes(query) ||
                String(row.Phone).toLowerCase().includes(query) ||
                String(row.PIN).toLowerCase().includes(query) ||
                (row.OpenBy || "").toLowerCase().includes(query)
            );
        });
    }, [data, search]);

    // 🔹 Ordenar datos filtrados
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            let valA = a[orderBy];
            let valB = b[orderBy];

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA < valB) return order === "asc" ? -1 : 1;
            if (valA > valB) return order === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredData, orderBy, order]);

    // 🔹 Datos de la página actual (ya ordenados)
    const currentPageData = useMemo(() => {
        return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [sortedData, page, rowsPerPage]);

    // Total de todos los datos filtrados
    const totalAmount = useMemo(() => {
        return data.reduce((acc, row) => acc + (Number(row.AmountPaid) || 0), 0);
    }, [data]);

    // Total de la página actual
    const totalAmountCurrentPage = useMemo(() => {
        return currentPageData.reduce((acc, row) => acc + (Number(row.AmountPaid) || 0), 0);
    }, [currentPageData]);

    const fetchDataReportLocker = async (showMsg = false) => {

        setIsErrorMsj(true);
        setLoading(true);

        const formatUTC = (d, isEnd = false) =>
            dayjs(d)
                .utc()
                .set("second", isEnd ? 59 : 0)
                .format("YYYY-MM-DD HH:mm:ss");

        const payload = {
            startDate: formatUTC(startDate),        // segundos en 00
            endDate: formatUTC(endDate, true),      // segundos en 59
            sendEmail: true,
        };

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
                        pb: 5 * scale,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <TextFieldVirtKeyPad
                            label="Buscar"
                            variant="standard"
                            fullWidth
                            value={search}
                            setValue={setSearch}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            sx={{
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: `${32 * scale}px`, // aquí controlas el tamaño real
                                                },
                                            }}
                                        >
                                            <ManageSearch />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                    <Box>
                        <Button
                            variant="outlined"
                            color="secondary"
                            sx={{
                                height: `${60 * scale}px`,
                                fontSize: `${24 * scale}px`,
                                fontWeight: 'normal',
                            }}
                            onClick={() => fetchDataReportLocker(true)}
                            disabled={disabledButton}
                        >
                            Enviar reporte
                            <ForwardToInbox sx={{ fontSize: 28 * scale, ml: 3 * scale }} />
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
                                    <TableCell sortDirection={orderBy === "ID" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "ID"}
                                            direction={orderBy === "ID" ? order : "asc"}
                                            onClick={() => handleSort("ID")}
                                        >
                                            Registro
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "LockerID" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "LockerID"}
                                            direction={orderBy === "LockerID" ? order : "asc"}
                                            onClick={() => handleSort("LockerID")}
                                        >
                                            Id Casillero
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "LockerCode" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "LockerCode"}
                                            direction={orderBy === "LockerCode" ? order : "asc"}
                                            onClick={() => handleSort("LockerCode")}
                                        >
                                            Casillero
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "Phone" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "Phone"}
                                            direction={orderBy === "Phone" ? order : "asc"}
                                            onClick={() => handleSort("Phone")}
                                        >
                                            Teléfono
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "PIN" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "PIN"}
                                            direction={orderBy === "PIN" ? order : "asc"}
                                            onClick={() => handleSort("PIN")}
                                        >
                                            PIN
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "Active" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "Active"}
                                            direction={orderBy === "Active" ? order : "asc"}
                                            onClick={() => handleSort("Active")}
                                        >
                                            Activo
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "StartTime" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "StartTime"}
                                            direction={orderBy === "StartTime" ? order : "asc"}
                                            onClick={() => handleSort("StartTime")}
                                        >
                                            Fecha Asignación
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "EndTime" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "EndTime"}
                                            direction={orderBy === "EndTime" ? order : "asc"}
                                            onClick={() => handleSort("EndTime")}
                                        >
                                            Fecha Retiro
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "AmountPaid" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "AmountPaid"}
                                            direction={orderBy === "AmountPaid" ? order : "asc"}
                                            onClick={() => handleSort("AmountPaid")}
                                        >
                                            Valor Pagado
                                        </TableSortLabel>
                                    </TableCell>

                                    <TableCell sortDirection={orderBy === "OpenBy" ? order : false}>
                                        <TableSortLabel
                                            active={orderBy === "OpenBy"}
                                            direction={orderBy === "OpenBy" ? order : "asc"}
                                            onClick={() => handleSort("OpenBy")}
                                        >
                                            Abierto por
                                        </TableSortLabel>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentPageData.map((row) => (
                                    <TableRow key={row.ID}>
                                        <TableCell>{row.ID}</TableCell>
                                        <TableCell>{row.LockerID}</TableCell>
                                        <TableCell>{row.LockerCode}</TableCell>
                                        <TableCell>{row.Phone}</TableCell>
                                        <TableCell>{row.PIN}</TableCell>
                                        <TableCell>{row.Active ? "Sí" : "No"}</TableCell>
                                        <TableCell>
                                            {row.StartTime ? formatter(row.StartTime).format("YYYY-MM-DD HH:mm:ss") : ""}
                                        </TableCell>
                                        <TableCell>
                                            {row.EndTime ? formatter(row.EndTime).format("YYYY-MM-DD HH:mm:ss") : ""}
                                        </TableCell>
                                        <TableCell>{formatCurrency(row.AmountPaid)}</TableCell>
                                        <TableCell>{row.OpenBy || "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Totales + paginación */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" px={5 * scale}>
                        {/* Totales alineados a la izquierda */}
                        <Box fontWeight="bold" sx={{ fontSize: `${20 * scale}px` }}>
                            Total Reporte: {formatCurrency(totalAmount)}
                        </Box>
                        <Box fontWeight="bold" sx={{ fontSize: `${20 * scale}px` }}>
                            Total Página: {formatCurrency(totalAmountCurrentPage)}
                        </Box>

                        {/* Paginación alineada a la derecha */}
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 20, 50, 100, 200, 500]}
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

            {loading && <Loading message={'Enviando...'} />}

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

