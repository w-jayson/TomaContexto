# ==========================================
# 1. Build Stage
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first to maximize layer caching on restores
COPY Directory.Build.props ./
COPY src/TomaSeuContexto.Domain/TomaSeuContexto.Domain.csproj src/TomaSeuContexto.Domain/
COPY src/TomaSeuContexto.Application/TomaSeuContexto.Application.csproj src/TomaSeuContexto.Application/
COPY src/TomaSeuContexto.Infrastructure/TomaSeuContexto.Infrastructure.csproj src/TomaSeuContexto.Infrastructure/
COPY src/TomaSeuContexto.Api/TomaSeuContexto.Api.csproj src/TomaSeuContexto.Api/

# Restore dependencies
RUN dotnet restore src/TomaSeuContexto.Api/TomaSeuContexto.Api.csproj

# Copy the rest of the source code
COPY src/ src/

# Build and publish release binaries
WORKDIR /src/src/TomaSeuContexto.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# ==========================================
# 2. Runtime Stage
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish .

# Expose standard container port
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "TomaSeuContexto.Api.dll"]
