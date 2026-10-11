# =============================================================================
# 01_load_and_clean.R
# Week 2 - Exploratory Data Analysis and Visualization
# Dataset : NYC Flights 2013 (nycflights13) - all domestic departures from
#           JFK, LGA and EWR in 2013, sourced from the US Bureau of
#           Transportation Statistics (BTS) and NOAA weather records.
# Purpose : Load the raw tables, audit data quality, clean and prepare a
#           single analysis-ready table.
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
})

# Paths are relative to the project root (run with the project root as the
# working directory, e.g. Rscript R/01_load_and_clean.R)
data_dir  <- "data"
table_dir <- file.path("outputs", "tables")
dir.create(table_dir, recursive = TRUE, showWarnings = FALSE)

# -----------------------------------------------------------------------------
# 1. Load the raw data
# -----------------------------------------------------------------------------
# If the nycflights13 package is installed you can use:
#   library(nycflights13); flights <- nycflights13::flights
# The same tables are shipped in /data as CSV files so the project runs offline.
flights  <- read.csv(unz(file.path(data_dir, "flights.csv.zip"), "flights.csv"),
                     stringsAsFactors = FALSE)
airlines <- read.csv(file.path(data_dir, "airlines.csv"), stringsAsFactors = FALSE)
weather  <- read.csv(file.path(data_dir, "weather.csv"),  stringsAsFactors = FALSE)
planes   <- read.csv(file.path(data_dir, "planes.csv"),   stringsAsFactors = FALSE)

cat("=== Raw table dimensions ===\n")
for (nm in c("flights", "airlines", "weather", "planes")) {
  d <- get(nm)
  cat(sprintf("%-9s %7d rows x %2d columns\n", nm, nrow(d), ncol(d)))
}

cat("\n=== Structure of flights ===\n")
str(flights)

# -----------------------------------------------------------------------------
# 2. Data-quality audit
# -----------------------------------------------------------------------------
missing_profile <- function(df, table_name) {
  data.frame(
    table      = table_name,
    column     = names(df),
    n_missing  = sapply(df, function(x) sum(is.na(x))),
    pct_missing = round(100 * sapply(df, function(x) mean(is.na(x))), 2),
    row.names  = NULL
  )
}

miss <- rbind(missing_profile(flights, "flights"),
              missing_profile(weather, "weather"),
              missing_profile(planes,  "planes"))
miss <- miss[miss$n_missing > 0, ]
miss <- miss[order(-miss$pct_missing), ]
cat("\n=== Columns with missing values ===\n")
print(miss, row.names = FALSE)
write.csv(miss, file.path(table_dir, "missing_values_profile.csv"), row.names = FALSE)

cat("\nFully duplicated flight rows :", sum(duplicated(flights)), "\n")
cat("Duplicated weather keys (origin + time_hour):",
    sum(duplicated(weather[, c("origin", "time_hour")])), "\n")

# Are the missing values structured? Check the pattern in flights.
pattern <- flights %>%
  mutate(dep_missing = is.na(dep_time),
         arr_missing = is.na(arr_time),
         arr_delay_missing = is.na(arr_delay)) %>%
  count(dep_missing, arr_missing, arr_delay_missing, name = "flights")
cat("\n=== Missing-value pattern in flights ===\n")
print(pattern)

# Weather range checks (physically implausible readings)
cat("\n=== Weather range check ===\n")
print(summary(weather[, c("temp", "wind_speed", "wind_gust", "precip",
                          "pressure", "visib")]))

# -----------------------------------------------------------------------------
# 3. Cleaning and preparation
# -----------------------------------------------------------------------------

# 3a. Helper: convert clock time stored as HHMM integer (e.g. 517, 2359, 2400)
#     into minutes after midnight. 2400 is recoded to 0 (midnight).
hhmm_to_min <- function(x) {
  ((x %/% 100) * 60 + x %% 100) %% 1440
}

# 3b. Weather: one known sensor error (wind speed > 1000 mph) -> set to NA.
#     wind_gust is ~80% missing, so it is dropped from modelling.
weather_clean <- weather %>%
  mutate(wind_speed = ifelse(wind_speed > 100, NA, wind_speed)) %>%
  select(origin, time_hour, temp, dewp, humid, wind_speed,
         precip, pressure, visib) %>%
  distinct(origin, time_hour, .keep_all = TRUE)

# 3c. Planes: rename the build year so it does not clash with flight year.
planes_clean <- planes %>%
  select(tailnum, plane_year = year, manufacturer, seats, engines)

# 3d. Flights: flag status, build calendar fields, join lookups.
flights_clean <- flights %>%
  mutate(
    # Status flags explain the structure of the missing values
    status = case_when(
      is.na(dep_time)                       ~ "Cancelled",
      !is.na(dep_time) & is.na(arr_delay)   ~ "Diverted/No arrival record",
      TRUE                                  ~ "Completed"
    ),
    date        = as.Date(sprintf("%d-%02d-%02d", year, month, day)),
    weekday     = factor(weekdays(date),
                         levels = c("Monday", "Tuesday", "Wednesday",
                                    "Thursday", "Friday", "Saturday", "Sunday")),
    month_lbl   = factor(month.abb[month], levels = month.abb),
    season      = case_when(month %in% c(12, 1, 2) ~ "Winter",
                            month %in% 3:5          ~ "Spring",
                            month %in% 6:8          ~ "Summer",
                            TRUE                    ~ "Autumn"),
    dep_min     = hhmm_to_min(dep_time),
    sched_dep_min = hhmm_to_min(sched_dep_time),
    # Standard BTS definition: on time = arrives less than 15 min late
    on_time     = ifelse(status == "Completed", arr_delay < 15, NA),
    delay_band  = cut(arr_delay,
                      breaks = c(-Inf, 0, 15, 60, 180, Inf),
                      labels = c("Early/On schedule", "1-14 min",
                                 "15-59 min", "1-3 hours", "3+ hours")),
    # Time gained or lost in the air
    gain        = dep_delay - arr_delay,
    speed_mph   = distance / (air_time / 60)
  ) %>%
  left_join(airlines, by = "carrier") %>%
  rename(airline = name) %>%
  left_join(weather_clean, by = c("origin", "time_hour")) %>%
  left_join(planes_clean,  by = "tailnum") %>%
  mutate(plane_age = ifelse(is.na(plane_year), NA, 2013 - plane_year))

cat("\n=== Flight status after flagging ===\n")
print(table(flights_clean$status))

cat("\nWeather match rate:",
    round(100 * mean(!is.na(flights_clean$temp)), 1), "% of flights\n")
cat("Plane match rate  :",
    round(100 * mean(!is.na(flights_clean$plane_year)), 1), "% of flights\n")

# 3e. Analysis subset: completed flights only (delays are defined).
completed <- flights_clean %>% filter(status == "Completed")
cat("\nCompleted flights used for delay analysis:", nrow(completed), "\n")

# 3f. Plausibility checks on the completed subset
cat("\n=== Plausibility checks ===\n")
cat("Implied speed > 600 mph :", sum(completed$speed_mph > 600, na.rm = TRUE), "\n")
cat("Arrival delay > 10 hours:", sum(completed$arr_delay > 600), "\n")

saveRDS(flights_clean, file.path("outputs", "flights_clean.rds"))
cat("\nSaved outputs/flights_clean.rds with", nrow(flights_clean), "rows and",
    ncol(flights_clean), "columns\n")
