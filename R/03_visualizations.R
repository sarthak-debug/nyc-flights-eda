# =============================================================================
# 03_visualizations.R
# Creates the nine figures used in the report (saved to outputs/figures).
# Monochrome styling is used so the charts print cleanly in black and white.
# Run after 01_load_and_clean.R
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(ggplot2)
  library(scales)
})

fig_dir <- file.path("outputs", "figures")
dir.create(fig_dir, recursive = TRUE, showWarnings = FALSE)

fl <- readRDS(file.path("outputs", "flights_clean.rds"))
completed <- fl %>% filter(status == "Completed")

# A common theme for every chart
theme_report <- theme_bw(base_size = 11, base_family = "serif") +
  theme(plot.title = element_text(face = "bold", size = 12),
        plot.subtitle = element_text(size = 9.5, colour = "grey25"),
        plot.caption = element_text(size = 8, colour = "grey35", hjust = 0),
        panel.grid.minor = element_blank(),
        legend.position = "bottom")
theme_set(theme_report)
src <- "Source: nycflights13 (BTS on-time data, NOAA weather), 2013"

save_fig <- function(p, name, w = 7, h = 4.3) {
  ggsave(file.path(fig_dir, name), p, width = w, height = h, dpi = 200)
}

# -----------------------------------------------------------------------------
# Figure 1 - Bar chart: missing values by column
# -----------------------------------------------------------------------------
miss <- read.csv(file.path("outputs", "tables", "missing_values_profile.csv"))
miss$label <- paste0(miss$table, ".", miss$column)
p1 <- ggplot(miss, aes(x = reorder(label, pct_missing), y = pct_missing)) +
  geom_col(fill = "grey45", width = 0.7) +
  geom_text(aes(label = paste0(pct_missing, "%")), hjust = -0.15, size = 3,
            family = "serif") +
  coord_flip() +
  scale_y_continuous(limits = c(0, 110), expand = c(0, 0)) +
  labs(title = "Figure 1. Share of missing values by column",
       subtitle = "Only columns with at least one missing value are shown",
       x = NULL, y = "Missing (%)", caption = src)
save_fig(p1, "fig01_missing_values.png", h = 4.6)

# -----------------------------------------------------------------------------
# Figure 2 - Histogram: distribution of arrival delay
# -----------------------------------------------------------------------------
m <- mean(completed$arr_delay); md <- median(completed$arr_delay)
p2 <- ggplot(completed, aes(arr_delay)) +
  geom_histogram(binwidth = 5, boundary = 0, fill = "grey70", colour = "grey30",
                 linewidth = 0.2) +
  geom_vline(xintercept = md, linetype = "dashed") +
  geom_vline(xintercept = m, linetype = "solid") +
  geom_vline(xintercept = 15, linetype = "dotted") +
  annotate("text", x = md, y = Inf, label = paste0("Median = ", md, " min"),
           hjust = 1.05, vjust = 1.5, size = 3, family = "serif") +
  annotate("text", x = m, y = Inf, label = paste0("Mean = ", round(m, 1), " min"),
           hjust = -0.08, vjust = 1.5, size = 3, family = "serif") +
  annotate("text", x = 15, y = Inf, label = "15-min on-time threshold",
           hjust = -0.05, vjust = 3.4, size = 3, family = "serif") +
  coord_cartesian(xlim = c(-80, 240)) +
  scale_y_continuous(labels = comma) +
  labs(title = "Figure 2. Distribution of arrival delay (completed flights)",
       subtitle = "Axis cut at 240 min for readability; 0.5% of flights lie beyond it (maximum 1,272 min)",
       x = "Arrival delay (minutes, negative = early)", y = "Number of flights",
       caption = src)
save_fig(p2, "fig02_hist_arrival_delay.png")

# -----------------------------------------------------------------------------
# Figure 3 - Box plot: arrival delay by carrier
# -----------------------------------------------------------------------------
carrier_order <- completed %>% group_by(carrier) %>%
  summarise(med = median(arr_delay), n = n()) %>% filter(n >= 300)
box_df <- completed %>% filter(carrier %in% carrier_order$carrier) %>%
  mutate(carrier = factor(carrier,
                          levels = carrier_order$carrier[order(carrier_order$med)]))
p3 <- ggplot(box_df, aes(carrier, arr_delay)) +
  geom_hline(yintercept = 15, linetype = "dotted") +
  geom_boxplot(fill = "grey85", outlier.shape = NA, linewidth = 0.35) +
  stat_summary(fun = mean, geom = "point", shape = 4, size = 2.2) +
  coord_cartesian(ylim = c(-60, 90)) +
  labs(title = "Figure 3. Arrival delay by carrier (ordered by median)",
       subtitle = "Box = interquartile range, bar = median, x = mean; outliers hidden, y-axis cut at 90 min.\nCarriers with fewer than 300 flights (OO) excluded. Dotted line = 15-min threshold",
       x = "Carrier code", y = "Arrival delay (minutes)", caption = src)
save_fig(p3, "fig03_box_delay_by_carrier.png", h = 4.6)

# -----------------------------------------------------------------------------
# Figure 4 - Line chart: monthly trend in delay and on-time rate
# -----------------------------------------------------------------------------
monthly <- fl %>% group_by(month_lbl) %>%
  summarise(`Mean departure delay (min)` = mean(dep_delay, na.rm = TRUE),
            `Mean arrival delay (min)`   = mean(arr_delay, na.rm = TRUE),
            `On-time arrival rate (%)`   = 100 * mean(on_time, na.rm = TRUE),
            `Cancellation rate (%)`      = 100 * mean(status == "Cancelled"),
            .groups = "drop") %>%
  pivot_longer(-month_lbl, names_to = "metric") %>%
  mutate(panel = ifelse(grepl("delay", metric), "Average delay (minutes)",
                        ifelse(grepl("On-time", metric), "On-time arrival rate (%)",
                               "Cancellation rate (%)")),
         panel = factor(panel, levels = c("Average delay (minutes)",
                                          "On-time arrival rate (%)",
                                          "Cancellation rate (%)")))
p4 <- ggplot(monthly, aes(month_lbl, value, group = metric, linetype = metric)) +
  geom_line(linewidth = 0.6) + geom_point(size = 1.6) +
  facet_wrap(~ panel, ncol = 1, scales = "free_y") +
  scale_linetype_manual(values = c("Mean departure delay (min)" = "solid",
                                   "Mean arrival delay (min)" = "dashed",
                                   "On-time arrival rate (%)" = "solid",
                                   "Cancellation rate (%)" = "solid"),
                        breaks = c("Mean departure delay (min)", "Mean arrival delay (min)")) +
  labs(title = "Figure 4. Monthly trend in delays, punctuality and cancellations",
       x = NULL, y = NULL, linetype = NULL, caption = src)
save_fig(p4, "fig04_line_monthly_trend.png", h = 6.2)

# -----------------------------------------------------------------------------
# Figure 5 - Time series: daily cancellations with anomalies labelled
# -----------------------------------------------------------------------------
daily <- read.csv(file.path("outputs", "tables", "daily_summary.csv")) %>%
  mutate(date = as.Date(date))
labs_df <- daily %>% filter(z_cancel > 3.2) %>%
  mutate(lbl = format(date, "%d %b"))
p5 <- ggplot(daily, aes(date, cancel_pct)) +
  geom_line(colour = "grey40", linewidth = 0.35) +
  geom_hline(yintercept = mean(daily$cancel_pct) + 3 * sd(daily$cancel_pct),
             linetype = "dashed") +
  geom_point(data = labs_df, shape = 21, fill = "white", size = 2) +
  geom_text(data = labs_df, aes(label = lbl), vjust = -0.9, size = 3,
            family = "serif") +
  scale_x_date(date_breaks = "1 month", date_labels = "%b") +
  scale_y_continuous(limits = c(0, 65)) +
  labs(title = "Figure 5. Daily cancellation rate, 2013",
       subtitle = "Dashed line = mean + 3 standard deviations (anomaly threshold)",
       x = NULL, y = "Flights cancelled (%)", caption = src)
save_fig(p5, "fig05_daily_cancellations.png")

# -----------------------------------------------------------------------------
# Figure 6 - Heat map: departure delay by weekday and hour
# -----------------------------------------------------------------------------
heat <- completed %>% filter(hour >= 5, hour <= 23) %>%
  group_by(weekday, hour) %>%
  summarise(mean_dep = mean(dep_delay), n = n(), .groups = "drop")
p6 <- ggplot(heat, aes(factor(hour), weekday, fill = mean_dep)) +
  geom_tile(colour = "white", linewidth = 0.4) +
  geom_text(aes(label = round(mean_dep),
                colour = mean_dep > 18), size = 2.6, family = "serif",
            show.legend = FALSE) +
  scale_colour_manual(values = c("black", "white")) +
  scale_fill_gradient(low = "grey97", high = "grey10",
                      name = "Mean departure delay (min)") +
  scale_y_discrete(limits = rev) +
  labs(title = "Figure 6. Departure delay by weekday and hour",
       subtitle = "Cell value = mean departure delay in minutes (completed flights)",
       x = "Scheduled departure hour", y = NULL, caption = src) +
  theme(panel.grid = element_blank(),
        legend.key.width = unit(1.4, "cm"))
save_fig(p6, "fig06_heatmap_weekday_hour.png", h = 4.4)

# -----------------------------------------------------------------------------
# Figure 7 - Scatter plot: departure vs arrival delay
# -----------------------------------------------------------------------------
set.seed(2013)
samp <- completed %>% sample_n(20000)
fit <- lm(arr_delay ~ dep_delay, data = completed)
p7 <- ggplot(samp, aes(dep_delay, arr_delay)) +
  geom_point(alpha = 0.15, size = 0.6, colour = "grey20") +
  geom_abline(intercept = 0, slope = 1, linetype = "dotted") +
  geom_smooth(method = "lm", se = FALSE, colour = "black", linewidth = 0.7,
              formula = y ~ x) +
  annotate("text", x = 420, y = 120,
           label = sprintf("Fitted: arr = %.1f + %.2f x dep\nr = %.2f, R-squared = %.2f",
                           coef(fit)[1], coef(fit)[2],
                           cor(completed$dep_delay, completed$arr_delay),
                           summary(fit)$r.squared),
           hjust = 0, size = 3.1, family = "serif") +
  coord_cartesian(xlim = c(-30, 700), ylim = c(-80, 700)) +
  labs(title = "Figure 7. Departure delay vs arrival delay",
       subtitle = "Random sample of 20,000 completed flights; solid line = linear fit, dotted = 45-degree line",
       x = "Departure delay (minutes)", y = "Arrival delay (minutes)", caption = src)
save_fig(p7, "fig07_scatter_dep_vs_arr.png", h = 4.8)

# -----------------------------------------------------------------------------
# Figure 8 - Correlation heat map: weather variables vs delay
# -----------------------------------------------------------------------------
wx <- c("dep_delay", "arr_delay", "temp", "dewp", "humid", "wind_speed",
        "precip", "pressure", "visib")
cm <- cor(completed[wx], use = "pairwise.complete.obs")
cm_long <- as.data.frame(as.table(cm)) %>%
  mutate(Var1 = factor(Var1, levels = wx), Var2 = factor(Var2, levels = rev(wx)))
p8 <- ggplot(cm_long, aes(Var1, Var2, fill = Freq)) +
  geom_tile(colour = "white") +
  geom_text(aes(label = sprintf("%.2f", Freq), colour = abs(Freq) > 0.55),
            size = 2.7, family = "serif", show.legend = FALSE) +
  scale_colour_manual(values = c("black", "white")) +
  scale_fill_gradient2(low = "grey35", mid = "white", high = "black",
                       midpoint = 0, limits = c(-1, 1), name = "Pearson r") +
  labs(title = "Figure 8. Correlation matrix: delays and weather",
       subtitle = "Pairwise-complete observations (pressure is 10% missing and is not imputed)",
       x = NULL, y = NULL, caption = src) +
  theme(axis.text.x = element_text(angle = 35, hjust = 1),
        panel.grid = element_blank(), legend.key.width = unit(1.2, "cm"))
save_fig(p8, "fig08_correlation_heatmap.png", w = 7, h = 6)

# -----------------------------------------------------------------------------
# Figure 9 - Grouped bar chart: weather conditions vs departure delay
# -----------------------------------------------------------------------------
wx_grp <- completed %>% filter(!is.na(visib), !is.na(precip)) %>%
  mutate(visib_band = cut(visib, c(-Inf, 1, 3, 5, 9.99, Inf),
                          labels = c("< 1 mi", "1-3 mi", "3-5 mi", "5-10 mi",
                                     "10 mi (clear)")),
         rain = ifelse(precip > 0, "Rain in departure hour", "Dry departure hour")) %>%
  group_by(visib_band, rain) %>%
  summarise(mean_dep = mean(dep_delay), n = n(), .groups = "drop")
p9 <- ggplot(wx_grp, aes(visib_band, mean_dep, fill = rain)) +
  geom_col(position = position_dodge(width = 0.75), width = 0.7,
           colour = "black", linewidth = 0.25) +
  geom_text(aes(label = round(mean_dep)), position = position_dodge(width = 0.75),
            vjust = -0.4, size = 3, family = "serif") +
  scale_fill_manual(values = c("grey85", "grey30"), name = NULL) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.1))) +
  labs(title = "Figure 9. Mean departure delay by visibility and rainfall",
       subtitle = "Completed flights joined to the hourly weather observation at the origin airport",
       x = "Visibility band", y = "Mean departure delay (minutes)", caption = src)
save_fig(p9, "fig09_bar_weather_conditions.png")

cat("Saved", length(list.files(fig_dir, pattern = "png$")), "figures to", fig_dir, "\n")
print(as.data.frame(wx_grp))
