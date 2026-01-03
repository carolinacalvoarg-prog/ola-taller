#!/bin/bash

echo "🚀 Instalación de Ola Taller - Sistema de Gestión de Turnos"
echo "============================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: Debes ejecutar este script desde la raíz del proyecto ola-taller${NC}"
    exit 1
fi

echo -e "${YELLOW}Paso 1: Verificando PostgreSQL...${NC}"
if docker ps | grep -q postgres-ola; then
    echo -e "${GREEN}✓ PostgreSQL está corriendo${NC}"
else
    echo -e "${RED}✗ PostgreSQL no está corriendo. Iniciando...${NC}"
    docker start postgres-ola
    sleep 3
fi
echo ""

echo -e "${YELLOW}Paso 2: Restaurando paquetes NuGet...${NC}"
cd backend
dotnet restore
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Paquetes restaurados correctamente${NC}"
else
    echo -e "${RED}✗ Error al restaurar paquetes${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Paso 3: Verificando herramientas de Entity Framework...${NC}"
if ! command -v dotnet-ef &> /dev/null; then
    echo "Instalando dotnet-ef..."
    dotnet tool install --global dotnet-ef
else
    echo -e "${GREEN}✓ dotnet-ef ya está instalado${NC}"
fi
echo ""

echo -e "${YELLOW}Paso 4: Creando migración inicial...${NC}"
cd OlaAPI
if [ ! -d "../OlaInfrastructure/Migrations" ]; then
    dotnet ef migrations add InitialCreate --project ../OlaInfrastructure --startup-project .
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migración creada correctamente${NC}"
    else
        echo -e "${RED}✗ Error al crear la migración${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ La migración ya existe${NC}"
fi
echo ""

echo -e "${YELLOW}Paso 5: Aplicando migración a la base de datos...${NC}"
dotnet ef database update --project ../OlaInfrastructure --startup-project .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Base de datos actualizada correctamente${NC}"
else
    echo -e "${RED}✗ Error al actualizar la base de datos${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Paso 6: Compilando el proyecto...${NC}"
dotnet build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Proyecto compilado correctamente${NC}"
else
    echo -e "${RED}✗ Error al compilar el proyecto${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✓ ¡Instalación del backend completada!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Para ejecutar el backend:"
echo "  cd backend/OlaAPI"
echo "  dotnet run"
echo ""
echo "La API estará disponible en:"
echo "  - https://localhost:7220"
echo "  - http://localhost:5079"
echo "  - Swagger UI: https://localhost:7220/swagger"
echo ""
echo -e "${YELLOW}Próximo paso: Instalar el frontend${NC}"
echo "  cd ../.."
echo "  npm create vite@latest frontend -- --template react"
echo "  cd frontend"
echo "  npm install"
echo "  npm run dev"
echo ""
