# =============================================================================
# 02_exploratory_analysis.R
# Summary statistics, trend tables and anomaly detection on the cleaned data.
# Run after 01_load_and_clean.R
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
})

table_dir <- file.path("outputs", "tables")
fl <- readRDS(file.path("outputs", "flights_clean.rds"))
completed <- fl %>% filter(status == "Completed")

options(width = 110)

# -----------------------------------------------------------------------------
# 1. Overall summary statistics for the key numeric variables
# -----------------------------------------------------------------------------
num_summary <- function(x) {
  c(n = sum(!is.na(x)), mean = mean(x, na.rm = TRUE), sd = sd(x, na.rm = TRUE),
    min = min(x, na.rm = TRUE), q1 = quantile(x, .25, na.rm = TRUE, names = FALSE),
    median = median(x, na.rm = TRUE),
    q3 = quantile(x, .75, na.rm = TRUE, names = FALSE),
    p95 = quantile(x, .95, na.rm = TRUE, names = FALSE),
    max = max(x, na.rm = TRUE))
}
vars <- c("dep_delay", "arr_delay", "gain", "air_time", "distance")
overall <- round(t(sapply(completed[vars], num_summary)), 1)
cat("=== Summary statistics: completed flights ===\n")
print(overall)
write.csv(overall, file.path(table_dir, "summary_statistics.csv"))

# Skewness (moment-based) to quantify the long right tail
skew <- function(x) { x <- x[!is.na(x)]; mean((x - mean(x))^3) / sd(x)^3 }
cat("\nSkewness of arr_delay:", round(skew(completed$arr_delay), 2), "\n")
cat("Skewness of dep_delay:", round(skew(completed$dep_delay), 2), "\n")

# -----------------------------------------------------------------------------
# 2. Headline KPIs
# -----------------------------------------------------------------------------
kpi <- fl %>% summarise(
  total_flights   = n(),
  cancelled_pct   = round(100 * mean(status == "Cancelled"), 2),
  on_time_pct     = round(100 * mean(on_time, na.rm = TRUE), 1),
  early_pct       = round(100 * mean(arr_delay <= 0, na.rm = TRUE), 1),
  over_60_pct     = round(100 * mean(arr_delay >= 60, na.rm = TRUE), 1),
  mean_arr_delay  = round(mean(arr_delay, na.rm = TRUE), 1),
  median_arr_delay = median(arr_delay, na.rm = TRUE)
)
cat("\n=== Headline KPIs (2013) ===\n"); print(t(kpi))

cat("\n=== Distribution across delay bands ===\n")
print(round(100 * prop.table(table(completed$delay_band)), 1))

# -----------------------------------------------------------------------------
# 3. Group comparisons
# -----------------------------------------------------------------------------
by_carrier <- fl %>%
  group_by(carrier, airline) %>%
  summarise(flights = n(),
            cancel_pct = round(100 * mean(status == "Cancelled"), 2),
            mean_arr_delay = round(mean(arr_delay, na.rm = TRUE), 1),
            median_arr_delay = median(arr_delay, na.rm = TRUE),
            on_time_pct = round(100 * mean(on_time, na.rm = TRUE), 1),
            .groups = "drop") %>%
  arrange(desc(mean_arr_delay))
cat("\n=== Performance by carrier ===\n"); print(as.data.frame(by_carrier))
write.csv(by_carrier, file.path(table_dir, "by_carrier.csv"), row.names = FALSE)

by_origin <- fl %>% group_by(origin) %>%
  summarise(flights = n(),
            cancel_pct = round(100 * mean(status == "Cancelled"), 2),
            mean_dep_delay = round(mean(dep_delay, na.rm = TRUE), 1),
            mean_arr_delay = round(mean(arr_delay, na.rm = TRUE), 1),
            on_time_pct = round(100 * mean(on_time, na.rm = TRUE), 1),
            .groups = "drop")
cat("\n=== Performance by origin airport ===\n"); print(as.data.frame(by_origin))
write.csv(by_origin, file.path(table_dir, "by_origin.csv"), row.names = FALSE)

by_month <- fl %>% group_by(month, month_lbl) %>%
  summarise(flights = n(),
            cancel_pct = round(100 * mean(status == "Cancelled"), 2),
            mean_dep_delay = round(mean(dep_delay, na.rm = TRUE), 1),
            mean_arr_delay = round(mean(arr_delay, na.rm = TRUE), 1),
            on_time_pct = round(100 * mean(on_time, na.rm = TRUE), 1),
            .groups = "drop")
cat("\n=== Performance by month ===\n"); print(as.data.frame(by_month))
write.csv(by_month, file.path(table_dir, "by_month.csv"), row.names = FALSE)

by_hour <- completed %>% filter(hour >= 5, hour <= 23) %>%
  group_by(hour) %>%
  summarise(flights = n(),
            mean_dep_delay = round(mean(dep_delay), 1),
            on_time_pct = round(100 * mean(on_time), 1), .groups = "drop")
cat("\n=== Performance by scheduled departure hour ===\n"); print(as.data.frame(by_hour))
write.csv(by_hour, file.path(table_dir, "by_hour.csv"), row.names = FALSE)

by_weekday <- completed %>% group_by(weekday) %>%
  summarise(flights = n(), mean_arr_delay = round(mean(arr_delay), 1),
            on_time_pct = round(100 * mean(on_time), 1), .groups = "drop")
cat("\n=== Performance by weekday ===\n"); print(as.data.frame(by_weekday))

# -----------------------------------------------------------------------------
# 4. Relationships
# -----------------------------------------------------------------------------
cat("\nCorrelation dep_delay vs arr_delay:",
    round(cor(completed$dep_delay, completed$arr_delay), 3), "\n")
fit <- lm(arr_delay ~ dep_delay, data = completed)
cat("Linear fit arr_delay = a + b*dep_delay  ->  a =",
    round(coef(fit)[1], 2), ", b =", round(coef(fit)[2], 3),
    ", R-squared =", round(summary(fit)$r.squared, 3), "\n")

wx_vars <- c("dep_delay", "arr_delay", "temp", "dewp", "humid", "wind_speed",
             "precip", "pressure", "visib")
cor_mat <- round(cor(completed[wx_vars], use = "pairwise.complete.obs"), 3)
cat("\n=== Correlation of delays with weather (pairwise complete) ===\n")
print(cor_mat[, c("dep_delay", "arr_delay")])
write.csv(cor_mat, file.path(table_dir, "weather_correlation.csv"))

# Precipitation and visibility in grouped form (correlations understate
# effects that only kick in under bad conditions)
precip_grp <- completed %>% filter(!is.na(precip)) %>%
  mutate(rain = ifelse(precip > 0, "Rain recorded", "Dry hour")) %>%
  group_by(rain) %>%
  summarise(flights = n(), mean_dep_delay = round(mean(dep_delay), 1),
            on_time_pct = round(100 * mean(on_time), 1), .groups = "drop")
cat("\n=== Dry vs rainy departure hours ===\n"); print(as.data.frame(precip_grp))

visib_grp <- completed %>% filter(!is.na(visib)) %>%
  mutate(visib_band = cut(visib, c(-Inf, 1, 3, 5, 9.99, Inf),
                          labels = c("<1 mi", "1-3 mi", "3-5 mi", "5-10 mi", "10 mi (clear)"))) %>%
  group_by(visib_band) %>%
  summarise(flights = n(), mean_dep_delay = round(mean(dep_delay), 1), .groups = "drop")
cat("\n=== Departure delay by visibility ===\n"); print(as.data.frame(visib_grp))

age_grp <- completed %>% filter(!is.na(plane_age)) %>%
  mutate(age_band = cut(plane_age, c(-Inf, 5, 10, 15, 20, Inf),
                        labels = c("0-5", "6-10", "11-15", "16-20", "20+"))) %>%
  group_by(age_band) %>%
  summarise(flights = n(), mean_arr_delay = round(mean(arr_delay), 1), .groups = "drop")
cat("\n=== Arrival delay by aircraft age (years) ===\n"); print(as.data.frame(age_grp))

# -----------------------------------------------------------------------------
# 5. Anomaly detection
# -----------------------------------------------------------------------------
# 5a. Days: daily cancellation and delay, flag z-score > 3
daily <- fl %>% group_by(date) %>%
  summarise(flights = n(), cancelled = sum(status == "Cancelled"),
            cancel_pct = round(100 * mean(status == "Cancelled"), 1),
            mean_dep_delay = round(mean(dep_delay, na.rm = TRUE), 1),
            .groups = "drop") %>%
  mutate(z_cancel = (cancel_pct - mean(cancel_pct)) / sd(cancel_pct),
         z_delay  = (mean_dep_delay - mean(mean_dep_delay)) / sd(mean_dep_delay))
write.csv(daily, file.path(table_dir, "daily_summary.csv"), row.names = FALSE)

cat("\n=== Anomalous days (z > 3 on cancellations or delay) ===\n")
print(as.data.frame(daily %>% filter(z_cancel > 3 | z_delay > 3) %>%
                      arrange(desc(cancel_pct)) %>%
                      mutate(across(c(z_cancel, z_delay), ~ round(.x, 1)))))

cat("\nLowest-volume days (holidays):\n")
print(as.data.frame(daily %>% arrange(flights) %>% select(date, flights) %>% head(5)))

# 5b. Individual flights: IQR rule on arrival delay
q <- quantile(completed$arr_delay, c(.25, .75))
upper <- q[2] + 1.5 * diff(q)
cat("\nIQR outlier fence for arr_delay:", upper, "minutes;",
    sum(completed$arr_delay > upper), "flights (",
    round(100 * mean(completed$arr_delay > upper), 1), "%) exceed it\n")

cat("\n=== Five longest arrival delays ===\n")
print(as.data.frame(completed %>% arrange(desc(arr_delay)) %>%
  select(date, carrier, flight, origin, dest, dep_delay, arr_delay) %>% head(5)))

# 5c. Implausibly fast flights (possible data-entry errors)
cat("\n=== Flights with implied ground speed > 600 mph ===\n")
print(as.data.frame(completed %>% filter(speed_mph > 600) %>%
  select(date, carrier, flight, origin, dest, distance, air_time, speed_mph) %>%
  mutate(speed_mph = round(speed_mph))))
