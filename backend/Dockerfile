# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files and restore
COPY OlaCore/OlaCore.csproj OlaCore/
COPY OlaInfrastructure/OlaInfrastructure.csproj OlaInfrastructure/
COPY OlaAPI/OlaAPI.csproj OlaAPI/
RUN dotnet restore OlaAPI/OlaAPI.csproj

# Copy everything else and build
COPY . .
RUN dotnet publish OlaAPI/OlaAPI.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published app
COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Run the app
ENTRYPOINT ["dotnet", "OlaAPI.dll"]
