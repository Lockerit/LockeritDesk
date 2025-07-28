import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

const fileName = 'copyright';

export default function Copyright() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        textAlign: 'center',
        bgcolor: 'transparent',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body1" color="text.primary">
          © {new Date().getFullYear()} Lockerit. Todos los derechos reservados.
        </Typography>
      </Container>
    </Box>
  );
}