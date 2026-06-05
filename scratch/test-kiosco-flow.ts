import { validateKioskAccess } from '../src/app/actions/kiosco';

async function main() {
    console.log("--- SIMULANDO ESCANEO DE PERSONAL: Carlos (INS001) ---");
    const resStaff = await validateKioskAccess("INS001", "AUTO");
    console.log("Resultado del escaneo de Personal:\n", JSON.stringify(resStaff, null, 2));

    console.log("\n--- SIMULANDO ESCANEO DE SOCIO INEXISTENTE (999999) ---");
    const resSocio = await validateKioskAccess("999999", "AUTO");
    console.log("Resultado del escaneo de Socio:\n", JSON.stringify(resSocio, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
