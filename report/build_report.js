// Builds the Week 2 EDA report (Word) from the R outputs.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, LevelFormat, PageBreak,
  Footer, PageNumber, TableOfContents, ShadingType,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const FIG = path.join(ROOT, "outputs", "figures");
const FONT = "Times New Roman";
const MONO = "Courier New";
const CONTENT_W = 9026; // A4 width minus 1" margins (DXA)

// ---------- helpers ----------
function runs(text, base = {}) {
  // **bold** markup
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) =>
    t.startsWith("**")
      ? new TextRun({ text: t.slice(2, -2), bold: true, ...base })
      : new TextRun({ text: t, ...base }));
}
const P = (text, opts = {}) => new Paragraph({
  children: runs(text), spacing: { after: 140, line: 300 },
  alignment: AlignmentType.JUSTIFIED, ...opts,
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level }, children: runs(t),
  spacing: { after: 80, line: 280 },
});
const N = (t, ref = "num1") => new Paragraph({
  numbering: { reference: ref, level: 0 }, children: runs(t),
  spacing: { after: 80, line: 280 },
});
const LABEL = (t) => new Paragraph({
  children: [new TextRun({ text: t, bold: true, italics: true, size: 21 })],
  spacing: { before: 120, after: 60 },
});
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080", space: 4 };
function CODE(text) {
  const lines = text.replace(/\s+$/, "").split("\n");
  return lines.map((ln, i) => new Paragraph({
    children: [new TextRun({ text: ln.length ? ln : " ", font: MONO, size: 16 })],
    spacing: { after: 0, line: 228 },
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    border: {
      left: border, right: border,
      ...(i === 0 ? { top: border } : {}),
      ...(i === lines.length - 1 ? { bottom: border } : {}),
    },
    keepLines: true, keepNext: i < lines.length - 1 && lines.length < 30,
    ...(i === lines.length - 1 ? { spacing: { after: 160, line: 228 } } : {}),
  }));
}
function FIGURE(file, caption, widthIn = 6.2) {
  const buf = fs.readFileSync(path.join(FIG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const pxW = Math.round(widthIn * 96), pxH = Math.round(pxW * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: pxW, height: pxH },
        altText: { title: caption, description: caption, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: caption, italics: true, size: 20 })] }),
  ];
}
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
function TABLE(headers, rows, widths, caption) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mk = (txt, i, head) => new TableCell({
    borders: cellBorders, width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: head ? { type: ShadingType.CLEAR, fill: "D9D9D9" } : undefined,
    children: [new Paragraph({
      alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
      children: [new TextRun({ text: String(txt), bold: head, size: 19 })] })],
  });
  const out = [];
  if (caption) out.push(new Paragraph({ spacing: { before: 120, after: 80 },
    children: [new TextRun({ text: caption, bold: true, size: 20 })] }));
  out.push(new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => mk(h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => mk(c, i, false)) }))],
  }));
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return out;
}
const PB = () => new Paragraph({ children: [new PageBreak()] });

// ---------- content ----------
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));

// Title page
add(
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Data Science with R Apprentice Internship", size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Week 2 Task", bold: true, size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "Exploratory Data Analysis and Visualization in R", bold: true, size: 36 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: "Flight Delays and Cancellations from New York City Airports, 2013", italics: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Submitted by: Prashansa Gharat", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Dataset: nycflights13 (US Bureau of Transportation Statistics and NOAA)", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Tools: R 4.3.3, dplyr, tidyr, ggplot2, scales", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Date: 10 October 2026", size: 24 })] }),
  PB(),
);

// Contents (static list)
const toc = ["1. Introduction and Objective", "2. Dataset Selection and Description",
  "3. Tools and Project Setup", "4. Data Loading and Quality Audit",
  "5. Data Cleaning and Preparation", "6. Exploratory Analysis",
  "7. Visualizations and Interpretation", "8. Summary of Key Findings", "9. Limitations",
  "10. How These Insights Guide Further Analysis", "11. Conclusion",
  "Appendix A. Project Structure and Reproducibility", "Appendix B. References"];
add(
  new Paragraph({ children: [new TextRun({ text: "Contents", bold: true, size: 28 })], spacing: { after: 240 } }),
  ...toc.map((t) => new Paragraph({ children: [new TextRun({ text: t, size: 24 })], spacing: { after: 120 } })),
  PB(),
);

// 1. Introduction
add(
  H1("1. Introduction and Objective"),
  P("The objective of this task is to carry out a complete exploratory data analysis (EDA) on a publicly available dataset using R, and to communicate what the data shows through a series of well-explained visualizations. EDA is the stage where an analyst gets to know the data before any modelling: checking its quality, understanding how variables are distributed, spotting trends and unusual values, and forming hypotheses that later analysis can test."),
  P("For this report I analysed every domestic flight that departed from the three New York City airports (JFK, LaGuardia and Newark) during 2013, a total of **336,776 flights**. The guiding business question was:"),
  P("**What drives flight delays and cancellations out of New York, and when, where and under what conditions does punctuality break down?**", { alignment: AlignmentType.CENTER }),
  P("The work was organised into five stages that follow the task brief, and each stage is written up in its own section of this report:"),
  N("Dataset selection and description (Section 2)"),
  N("Data loading and quality audit (Section 4)"),
  N("Data cleaning and preparation, including handling of missing values (Section 5)"),
  N("Exploratory analysis with summary statistics, trends and anomaly detection (Section 6)"),
  N("Visualization and interpretation of nine charts of seven different types (Section 7)"),
  P("All analysis was done in R scripts that can be re-run from start to finish. The full code, data and output files are organised as a GitHub project (see Appendix A)."),
);

// 2. Dataset
add(
  H1("2. Dataset Selection and Description"),
  H2("2.1 About the dataset"),
  P("The dataset is **nycflights13**, a well-known public dataset maintained by Hadley Wickham and distributed on CRAN as an R package. It contains on-time performance records originally published by the **US Bureau of Transportation Statistics (BTS)**, together with hourly weather observations from the **National Oceanic and Atmospheric Administration (NOAA)**. It is released under the CC0 public-domain licence, so it can be freely used and shared."),
  P("The dataset is relational: it consists of several tables that link to each other through key columns. I used four of them:"),
  ...TABLE(["Table", "Rows", "Columns", "Content", "Join key"], [
    ["flights", "336,776", "19", "One row per scheduled departure: dates, scheduled and actual times, delays, carrier, route, distance", "-"],
    ["weather", "26,115", "15", "Hourly weather at each origin airport: temperature, humidity, wind, precipitation, pressure, visibility", "origin + time_hour"],
    ["planes", "3,322", "9", "Aircraft details: build year, manufacturer, seats, engines", "tailnum"],
    ["airlines", "16", "2", "Carrier code to full airline name", "carrier"],
  ], [1150, 950, 1050, 4276, 1600], "Table 1. Tables used in the analysis"),
  P("The most important variables for this analysis are described below."),
  ...TABLE(["Variable", "Type", "Description"], [
    ["dep_delay / arr_delay", "Numeric (minutes)", "Departure and arrival delay. Negative values mean the flight left or arrived early"],
    ["dep_time / sched_dep_time", "Integer (HHMM)", "Actual and scheduled departure clock time, e.g. 517 = 05:17"],
    ["carrier", "Categorical", "Two-letter airline code (16 carriers)"],
    ["origin / dest", "Categorical", "Origin airport (EWR, JFK, LGA) and destination airport (105 destinations)"],
    ["air_time / distance", "Numeric", "Minutes in the air and route distance in miles"],
    ["time_hour", "Date-time", "Scheduled departure hour, used to join weather"],
    ["precip, visib, wind_speed, humid, pressure, temp", "Numeric", "Weather conditions at the origin airport during the departure hour"],
  ], [2500, 1700, 4826], "Table 2. Key variables"),
  H2("2.2 Why I selected this dataset"),
  P("I chose this dataset for four reasons:"),
  B("**Relevance to my work.** In my role as an operations and reporting analyst in manufacturing I work with supply-chain KPIs such as on-time-in-full (OTIF) delivery. Flight punctuality is the same kind of problem: a scheduled time, an actual time, and a delay that needs to be explained. The analytical approach used here (delay distributions, on-time rates, root-cause segmentation by time, resource and external conditions) transfers directly to delivery performance analysis."),
  B("**Size and realism.** With over 336,000 rows it is large enough for patterns to be statistically meaningful, but small enough to analyse on a laptop in R."),
  B("**Genuine data-quality issues.** The data contains real missing values, sensor errors and implausible records, so the cleaning stage is a meaningful exercise rather than a formality."),
  B("**Variety of data types.** It has numeric, categorical, date and time variables across several linked tables, which allows a wide range of visualizations (histograms, box plots, line charts, heat maps and scatter plots) and practice with joins."),
);

// 3. Tools
add(
  H1("3. Tools and Project Setup"),
  P("The analysis was carried out in **R 4.3.3** using the tidyverse family of packages. Table 3 lists the packages and their roles."),
  ...TABLE(["Package", "Version", "Used for"], [
    ["dplyr", "1.1.4", "Filtering, grouping, summarising and joining tables"],
    ["tidyr", "1.3.1", "Reshaping data between wide and long format (pivot_longer)"],
    ["ggplot2", "3.4.4", "All visualizations"],
    ["scales", "1.3.0", "Axis label formatting (commas, percentages)"],
    ["base R (stats)", "4.3.3", "Summary statistics, correlation, linear regression, quantiles"],
  ], [2000, 1200, 5826], "Table 3. R packages used"),
  P("To keep the work reproducible and easy to review, I split the code into three scripts that are run in order. Each script reads the output of the previous one."),
  ...TABLE(["Script", "Purpose", "Main outputs"], [
    ["R/01_load_and_clean.R", "Load raw tables, audit quality, clean and join", "outputs/flights_clean.rds, missing-value profile"],
    ["R/02_exploratory_analysis.R", "Summary statistics, group comparisons, correlations, anomaly detection", "CSV tables in outputs/tables"],
    ["R/03_visualizations.R", "Create the nine figures used in this report", "PNG files in outputs/figures"],
  ], [2700, 3400, 2926], "Table 4. Project scripts"),
  P("All charts use a consistent monochrome theme (black, white and shades of grey) so that they remain readable when the report is printed. The common theme was defined once and applied to every figure:"),
  ...CODE(`theme_report <- theme_bw(base_size = 11, base_family = "serif") +
  theme(plot.title = element_text(face = "bold", size = 12),
        plot.subtitle = element_text(size = 9.5, colour = "grey25"),
        panel.grid.minor = element_blank(),
        legend.position = "bottom")
theme_set(theme_report)`),
);

// 4. Loading and audit
add(
  H1("4. Data Loading and Quality Audit"),
  H2("4.1 Loading the data"),
  P("The tables are available in the nycflights13 R package. To make the project run without depending on a package download, I saved the same tables as CSV files in the project's data folder and loaded them with read.csv. The flights table is kept zipped (31 MB unzipped) and read directly from the archive."),
  ...CODE(`flights  <- read.csv(unz("data/flights.csv.zip", "flights.csv"),
                     stringsAsFactors = FALSE)
airlines <- read.csv("data/airlines.csv", stringsAsFactors = FALSE)
weather  <- read.csv("data/weather.csv",  stringsAsFactors = FALSE)
planes   <- read.csv("data/planes.csv",   stringsAsFactors = FALSE)`),
  LABEL("Console output"),
  ...CODE(`=== Raw table dimensions ===
flights    336776 rows x 19 columns
airlines       16 rows x  2 columns
weather     26115 rows x 15 columns
planes       3322 rows x  9 columns`),
  H2("4.2 Missing values"),
  P("I wrote a small function that profiles missing values in every column of every table, so that all gaps could be reviewed together before deciding how to treat them."),
  ...CODE(`missing_profile <- function(df, table_name) {
  data.frame(table = table_name, column = names(df),
             n_missing   = sapply(df, function(x) sum(is.na(x))),
             pct_missing = round(100 * sapply(df, function(x) mean(is.na(x))), 2))
}
miss <- rbind(missing_profile(flights, "flights"),
              missing_profile(weather, "weather"),
              missing_profile(planes,  "planes"))
miss <- miss[miss$n_missing > 0, ]`),
  ...FIGURE("fig01_missing_values.png", "Figure 1. Bar chart of the share of missing values by column"),
  P("**What Figure 1 shows.** Missing values fall into three very different groups. Two columns are almost empty: aircraft cruising **speed** (99.3% missing) and **wind gust** (79.6% missing). A middle group contains **air pressure** at 10.5%. The remaining columns, including all the delay and time fields in the flights table, are missing for less than 3% of rows. The treatment for each group is different, so it was important not to apply one blanket rule such as deleting every incomplete row, which would have thrown away most of the weather data."),
  H2("4.3 The missing values in flights are structured, not random"),
  P("A key finding of the audit was that the gaps in the flights table follow a clear pattern. Cross-tabulating which time fields are missing showed only four combinations:"),
  ...CODE(`  dep_missing arr_missing arr_delay_missing flights
1       FALSE       FALSE             FALSE  327346
2       FALSE       FALSE              TRUE     717
3       FALSE        TRUE              TRUE     458
4        TRUE        TRUE              TRUE    8255`),
  P("Every flight with no departure time (8,255) also has no arrival information. These are **cancelled flights**: they were scheduled but never left. A further 1,175 flights departed but have no arrival delay recorded, which is consistent with **diversions** to another airport. This means the missing values carry real information and should be turned into a status flag rather than imputed. Filling in a delay for a flight that never flew would be meaningless."),
  H2("4.4 Other quality checks"),
  B("**Duplicates:** there are no fully duplicated flight rows and no duplicated weather keys (origin + hour), so joins will not multiply rows."),
  B("**Range check on weather:** wind_speed has a maximum of **1,048 mph**, which is physically impossible (the strongest recorded hurricane winds are around 200 mph). This is a sensor or entry error."),
  B("**Time format:** departure and arrival times are stored as integers in HHMM form (e.g. 517 = 05:17, and midnight sometimes appears as 2400). These cannot be used for arithmetic directly."),
  B("**Plausibility of flights:** four flights have an implied ground speed above 600 mph, faster than commercial jets normally fly, which suggests errors in recorded air time."),
);

// 5. Cleaning
add(
  H1("5. Data Cleaning and Preparation"),
  P("Based on the audit, I applied the following cleaning and preparation steps. Table 5 summarises each decision and the reason behind it; the code for each step follows."),
  ...TABLE(["#", "Step", "Action taken", "Reason"], [
    ["1", "Cancelled flights", "Flagged with status = \"Cancelled\" (8,255 rows); kept in the data", "Needed for cancellation-rate analysis; excluded from delay statistics because no delay exists"],
    ["2", "Diverted flights", "Flagged as \"Diverted/No arrival record\" (1,175 rows)", "Departure happened but arrival delay is undefined"],
    ["3", "Wind speed error", "Values above 100 mph set to NA (affects 1 reading)", "Physically impossible value would distort means and correlations"],
    ["4", "Wind gust", "Dropped", "80% missing; imputing would invent most of the column"],
    ["5", "Plane speed", "Dropped", "99% missing; no analytical value"],
    ["6", "Air pressure", "Kept, not imputed; pairwise-complete correlations used", "10% missing; imputing from a weakly related variable would add noise"],
    ["7", "HHMM times", "Converted to minutes after midnight; 2400 recoded to 0", "Allows arithmetic and correct ordering"],
    ["8", "Calendar fields", "Created date, weekday, month label and season", "Needed for trend and seasonality analysis"],
    ["9", "Derived KPIs", "on_time (arr_delay < 15), delay_band, gain (time made up in the air), speed_mph", "BTS standard on-time definition; extra features for analysis"],
    ["10", "Joins", "Added airline name, origin weather and plane age via left joins", "Left joins keep every flight even when a lookup has no match"],
    ["11", "Plane year", "Renamed to plane_year before joining", "Avoids a name clash with the flight's year column"],
  ], [400, 1500, 3400, 3726], "Table 5. Cleaning and preparation decisions"),
  H3("Converting clock times and fixing the weather error"),
  ...CODE(`# HHMM integer -> minutes after midnight (2400 becomes 0)
hhmm_to_min <- function(x) ((x %/% 100) * 60 + x %% 100) %% 1440

weather_clean <- weather %>%
  mutate(wind_speed = ifelse(wind_speed > 100, NA, wind_speed)) %>%
  select(origin, time_hour, temp, dewp, humid, wind_speed,
         precip, pressure, visib)            # wind_gust dropped

planes_clean <- planes %>%
  select(tailnum, plane_year = year, manufacturer, seats, engines)`),
  H3("Flagging status, creating features and joining"),
  ...CODE(`flights_clean <- flights %>%
  mutate(
    status = case_when(
      is.na(dep_time)                     ~ "Cancelled",
      !is.na(dep_time) & is.na(arr_delay) ~ "Diverted/No arrival record",
      TRUE                                ~ "Completed"),
    date      = as.Date(sprintf("%d-%02d-%02d", year, month, day)),
    weekday   = factor(weekdays(date), levels = c("Monday", "Tuesday",
                  "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")),
    month_lbl = factor(month.abb[month], levels = month.abb),
    dep_min   = hhmm_to_min(dep_time),
    on_time   = ifelse(status == "Completed", arr_delay < 15, NA),
    delay_band = cut(arr_delay, breaks = c(-Inf, 0, 15, 60, 180, Inf),
                     labels = c("Early/On schedule", "1-14 min", "15-59 min",
                                "1-3 hours", "3+ hours")),
    gain      = dep_delay - arr_delay,
    speed_mph = distance / (air_time / 60)) %>%
  left_join(airlines, by = "carrier") %>% rename(airline = name) %>%
  left_join(weather_clean, by = c("origin", "time_hour")) %>%
  left_join(planes_clean,  by = "tailnum") %>%
  mutate(plane_age = 2013 - plane_year)`),
  LABEL("Console output"),
  ...CODE(`=== Flight status after flagging ===
                 Cancelled                  Completed
                      8255                     327346
Diverted/No arrival record
                      1175

Weather match rate: 99.5 % of flights
Plane match rate  : 82.8 % of flights
Completed flights used for delay analysis: 327346`),
  H2("5.1 Validating the joins"),
  P("After joining, I checked how many flights found a match in each lookup table. **99.5%** of flights matched an hourly weather record, which confirmed that the time_hour key is consistent between the two tables. Only **82.8%** of flights matched an aircraft in the planes table. Inspection showed that 83% of the unmatched flights belong to just two carriers, Envoy Air (MQ) and American Airlines (AA), which report fleet numbers rather than registration numbers. Because this gap is concentrated in specific carriers, any finding about aircraft age must be read with care, and I note this as a limitation in Section 9."),
  H2("5.2 Final analysis dataset"),
  P("The cleaned table has **336,776 rows and 43 columns**. For delay statistics I use the **327,346 completed flights**; for cancellation statistics I use all flights. Extreme delays (up to 21 hours) were **kept** rather than removed: they are real events, not errors, and they matter to passengers. To prevent them from dominating the analysis I report medians and percentiles alongside means, and I cut axis ranges in charts where needed, stating the cut in the chart subtitle. Only the four implausibly fast flights are flagged as suspected data errors; they are too few to affect any results."),
);

// 6. EDA
add(
  H1("6. Exploratory Analysis"),
  H2("6.1 Summary statistics"),
  P("Table 6 gives the main descriptive statistics for the completed flights. A custom function returned the count, mean, standard deviation, minimum, quartiles, 95th percentile and maximum for each variable."),
  ...CODE(`num_summary <- function(x) {
  c(n = sum(!is.na(x)), mean = mean(x, na.rm = TRUE), sd = sd(x, na.rm = TRUE),
    min = min(x, na.rm = TRUE), q1 = quantile(x, .25, na.rm = TRUE, names = FALSE),
    median = median(x, na.rm = TRUE), q3 = quantile(x, .75, na.rm = TRUE, names = FALSE),
    p95 = quantile(x, .95, na.rm = TRUE, names = FALSE), max = max(x, na.rm = TRUE))
}
vars <- c("dep_delay", "arr_delay", "gain", "air_time", "distance")
round(t(sapply(completed[vars], num_summary)), 1)`),
  ...TABLE(["Variable", "Mean", "SD", "Min", "Q1", "Median", "Q3", "P95", "Max"], [
    ["dep_delay (min)", "12.6", "40.1", "-43", "-5", "-2", "11", "88", "1,301"],
    ["arr_delay (min)", "6.9", "44.6", "-86", "-17", "-5", "14", "91", "1,272"],
    ["gain (min)", "5.7", "18.0", "-196", "-3", "7", "17", "31", "109"],
    ["air_time (min)", "150.7", "93.7", "20", "82", "129", "192", "339", "695"],
    ["distance (miles)", "1,048", "736", "80", "509", "888", "1,389", "2,475", "4,983"],
  ], [1826, 750, 750, 750, 750, 950, 750, 850, 1100], "Table 6. Summary statistics, completed flights (n = 327,346)"),
  P("**Interpretation.** The delay variables are strongly **right-skewed**. The median arrival delay is **-5 minutes** (the typical flight arrives early), but the mean is **+6.9 minutes** because a minority of very late flights pull the average up. The skewness coefficient confirms this: 3.72 for arrival delay and 4.82 for departure delay (a symmetric distribution would be 0). The standard deviation of 44.6 minutes is six times the mean, so the mean alone is a poor summary of a typical passenger's experience. The positive median **gain** of 7 minutes shows that flights typically make up time in the air, a point explored further in Figure 7."),
  H2("6.2 Headline performance indicators"),
  ...TABLE(["Indicator", "Value"], [
    ["Total scheduled flights", "336,776"],
    ["Cancellation rate", "2.45%"],
    ["On-time arrival rate (arrived < 15 min late)", "75.5%"],
    ["Arrived early or exactly on schedule", "59.4%"],
    ["Arrived 1 hour or more late", "8.7%"],
    ["Mean / median arrival delay", "6.9 min / -5 min"],
  ], [6026, 3000], "Table 7. Headline KPIs for 2013"),
  P("Roughly three out of four flights arrived on time by the industry definition. The distribution across delay bands was: early or on schedule 59.4%, 1-14 minutes late 16.9%, 15-59 minutes late 15.2%, 1-3 hours late 7.3%, and more than 3 hours late 1.2%."),
  H2("6.3 Comparisons across groups"),
  P("I then grouped the data by carrier, origin airport, month, departure hour and weekday. The pattern of code was the same each time; the carrier example is shown below."),
  ...CODE(`by_carrier <- fl %>%
  group_by(carrier, airline) %>%
  summarise(flights          = n(),
            cancel_pct       = round(100 * mean(status == "Cancelled"), 2),
            mean_arr_delay   = round(mean(arr_delay, na.rm = TRUE), 1),
            median_arr_delay = median(arr_delay, na.rm = TRUE),
            on_time_pct      = round(100 * mean(on_time, na.rm = TRUE), 1),
            .groups = "drop") %>%
  arrange(desc(mean_arr_delay))`),
  ...TABLE(["Carrier", "Airline", "Flights", "Cancel %", "Mean arr. delay", "On-time %"], [
    ["F9", "Frontier Airlines", "685", "0.44", "21.9", "61.2"],
    ["FL", "AirTran Airways", "3,260", "2.24", "20.1", "65.4"],
    ["EV", "ExpressJet Airlines", "54,173", "5.20", "15.8", "67.9"],
    ["YV", "Mesa Airlines", "601", "9.32", "15.6", "67.1"],
    ["MQ", "Envoy Air", "26,397", "4.67", "10.8", "72.1"],
    ["WN", "Southwest Airlines", "12,275", "1.56", "9.6", "74.3"],
    ["B6", "JetBlue Airways", "54,635", "0.85", "9.5", "73.0"],
    ["9E", "Endeavor Air", "18,460", "5.66", "7.4", "74.4"],
    ["UA", "United Air Lines", "58,665", "1.17", "3.6", "77.5"],
    ["US", "US Airways", "20,536", "3.23", "2.1", "81.2"],
    ["VX", "Virgin America", "5,162", "0.60", "1.8", "81.3"],
    ["DL", "Delta Air Lines", "48,110", "0.73", "1.6", "81.0"],
    ["AA", "American Airlines", "32,729", "1.94", "0.4", "80.6"],
    ["HA", "Hawaiian Airlines", "342", "0.00", "-6.9", "87.1"],
    ["AS", "Alaska Airlines", "714", "0.28", "-9.9", "85.3"],
  ], [900, 2626, 1200, 1100, 1700, 1500], "Table 8. Performance by carrier (OO, 32 flights, omitted), sorted by mean arrival delay"),
  P("The spread between carriers is wide. The three largest carriers at these airports (United, JetBlue and ExpressJet) account for half of all flights but perform very differently: United achieved 77.5% on time, JetBlue 73.0% and ExpressJet only 67.9%, with ExpressJet also cancelling 5.2% of its flights. The regional carriers (ExpressJet, Envoy, Endeavor, Mesa) have the highest cancellation rates, which suggests that when the system is under pressure, smaller regional flights are cancelled first."),
  ...TABLE(["Origin", "Flights", "Cancel %", "Mean dep. delay", "Mean arr. delay", "On-time %"], [
    ["EWR (Newark)", "120,835", "2.68", "15.1", "9.1", "73.7"],
    ["JFK", "111,279", "1.67", "12.1", "5.6", "76.3"],
    ["LGA (LaGuardia)", "104,662", "3.01", "10.3", "5.8", "76.9"],
  ], [2026, 1400, 1200, 1500, 1500, 1400], "Table 9. Performance by origin airport"),
  P("Newark is the busiest airport and has the longest delays. LaGuardia has the shortest departure delays but the highest cancellation rate, which may reflect its tighter capacity: when conditions deteriorate, LaGuardia appears to cancel rather than hold flights."),
  P("Grouping by weekday showed **Saturday** as clearly the best day (82.5% on time, mean arrival delay -1.4 minutes) and **Thursday** as the worst (71.5% on time, 11.7 minutes). Saturday also has around 20% fewer flights, pointing to congestion as a driver of delay."),
  H2("6.4 Anomaly detection"),
  P("I used two complementary methods to look for anomalies. At the **day level**, I calculated the daily cancellation rate and mean departure delay and flagged days with a z-score above 3 (more than three standard deviations above the yearly average). At the **flight level**, I used the interquartile range (IQR) rule on arrival delay."),
  ...CODE(`daily <- fl %>% group_by(date) %>%
  summarise(flights = n(), cancel_pct = 100 * mean(status == "Cancelled"),
            mean_dep_delay = mean(dep_delay, na.rm = TRUE)) %>%
  mutate(z_cancel = (cancel_pct - mean(cancel_pct)) / sd(cancel_pct),
         z_delay  = (mean_dep_delay - mean(mean_dep_delay)) / sd(mean_dep_delay))
daily %>% filter(z_cancel > 3 | z_delay > 3)

q <- quantile(completed$arr_delay, c(.25, .75))
upper <- q[2] + 1.5 * diff(q)          # IQR fence = 60.5 minutes`),
  ...TABLE(["Date", "Flights", "Cancelled %", "Mean dep. delay", "z (cancel)", "Possible cause (external)"], [
    ["9 Feb 2013", "684", "57.5", "18.5", "10.6", "Blizzard \"Nemo\" (day 2)"],
    ["8 Feb 2013", "930", "50.8", "14.9", "9.3", "Blizzard \"Nemo\" (day 1)"],
    ["23 May 2013", "988", "22.4", "51.1", "3.8", "Storms (to be confirmed)"],
    ["10 Dec 2013", "943", "21.6", "26.5", "3.7", "Winter weather (to be confirmed)"],
    ["12 Sep 2013", "992", "19.4", "50.0", "3.3", "Storms (to be confirmed)"],
    ["8 Mar 2013", "979", "18.4", "83.5", "3.1", "Late-winter storm; worst delay day"],
  ], [1400, 900, 1200, 1500, 1100, 2926], "Table 10. Most anomalous days (z-score > 3)"),
  P("The two most extreme days by far are **8 and 9 February 2013**, when more than half of all flights were cancelled. These dates match the major North-East blizzard of February 2013. The other flagged days are likely weather-related as well, but the dataset itself does not record causes, so this would need to be confirmed against external weather reports. Interestingly, the day-level anomalies come in two types: days with mass **cancellations** but moderate delays (the blizzard, when airlines cancelled pre-emptively), and days with extreme **delays** but fewer cancellations (such as 8 March, with a mean departure delay of 83.5 minutes). This suggests airlines react differently to forecast events than to sudden disruption."),
  P("At the flight level, the IQR fence for arrival delay is **60.5 minutes**, and 27,789 flights (8.5%) exceed it. This is far more than the roughly 0.7% that would be expected for normally distributed data, which again shows how heavy the right tail is. The single longest delay was Hawaiian Airlines flight 51 from JFK to Honolulu on 9 January 2013, which departed 1,301 minutes (21.7 hours) late. I treated these flights as genuine extreme events and kept them."),
  P("Other anomalies noted: the lowest-volume days were 28-29 November (Thanksgiving), which is expected holiday behaviour; and four flights had an implied speed above 600 mph (e.g. Delta 1499 LGA-ATL at 703 mph), which are probable air-time recording errors."),
);

// 7. Visualizations
add(
  H1("7. Visualizations and Interpretation"),
  P("This section presents the main charts. Together they cover seven chart types: bar chart (Figure 1, shown earlier), histogram, box plot, multi-panel line chart, time series, heat map, scatter plot, correlation matrix and grouped bar chart. For each one I show the key code, the output and an interpretation covering what the chart reveals and how it guides further analysis."),

  H2("7.1 Histogram: distribution of arrival delay"),
  ...CODE(`ggplot(completed, aes(arr_delay)) +
  geom_histogram(binwidth = 5, boundary = 0, fill = "grey70", colour = "grey30") +
  geom_vline(xintercept = median(completed$arr_delay), linetype = "dashed") +
  geom_vline(xintercept = mean(completed$arr_delay),   linetype = "solid") +
  geom_vline(xintercept = 15, linetype = "dotted") +
  coord_cartesian(xlim = c(-80, 240))`),
  ...FIGURE("fig02_hist_arrival_delay.png", "Figure 2. Histogram of arrival delay"),
  P("**What it reveals.** The distribution has a tall peak just below zero and a long tail stretching to the right. Most flights arrive between 30 minutes early and 15 minutes late, but the tail continues well beyond four hours. The gap between the median (-5 min, dashed line) and the mean (6.9 min, solid line) is a direct visual result of this skew. I used coord_cartesian rather than filtering, so that the cut-off at 240 minutes does not remove data from the calculation of the mean and median."),
  P("**How it guides further analysis.** Because the data is so skewed, reporting and modelling should use medians, percentiles or a transformed target, not just the mean. It also suggests treating delay as two problems: whether a flight is delayed (a classification problem) and, if so, by how much (a regression problem on the tail)."),

  H2("7.2 Box plot: arrival delay by carrier"),
  ...CODE(`ggplot(box_df, aes(carrier, arr_delay)) +       # carriers ordered by median
  geom_hline(yintercept = 15, linetype = "dotted") +
  geom_boxplot(fill = "grey85", outlier.shape = NA) +
  stat_summary(fun = mean, geom = "point", shape = 4, size = 2.2) +
  coord_cartesian(ylim = c(-60, 90))`),
  ...FIGURE("fig03_box_delay_by_carrier.png", "Figure 3. Box plot of arrival delay by carrier"),
  P("**What it reveals.** Ordering the carriers by median makes the ranking easy to read. Alaska (AS) and Hawaiian (HA) sit lowest, while Frontier (F9), AirTran (FL) and Mesa (YV) sit highest. Two points stand out. First, for every carrier the mean (x) is above the median, so all carriers share the same skewed shape. Second, the boxes for the worst carriers are much taller: their upper quartile reaches 20-30 minutes, meaning a quarter of their flights miss the on-time threshold by a wide margin. Variability, not only the typical delay, is what separates good and bad performers."),
  P("**How it guides further analysis.** Carrier is a strong candidate predictor. However, carriers fly different routes at different times of day, so a fair comparison should control for route and departure hour, for example with a regression model or by comparing carriers on the same routes."),

  H2("7.3 Line chart: monthly trends"),
  ...CODE(`monthly <- fl %>% group_by(month_lbl) %>%
  summarise(\`Mean departure delay (min)\` = mean(dep_delay, na.rm = TRUE),
            \`Mean arrival delay (min)\`   = mean(arr_delay, na.rm = TRUE),
            \`On-time arrival rate (%)\`   = 100 * mean(on_time, na.rm = TRUE),
            \`Cancellation rate (%)\`      = 100 * mean(status == "Cancelled")) %>%
  pivot_longer(-month_lbl, names_to = "metric")
ggplot(monthly, aes(month_lbl, value, group = metric, linetype = metric)) +
  geom_line() + geom_point() + facet_wrap(~ panel, ncol = 1, scales = "free_y")`),
  ...FIGURE("fig04_line_monthly_trend.png", "Figure 4. Monthly trend in delays, on-time rate and cancellations", 5.8),
  P("**What it reveals.** There is a clear seasonal pattern with three problem periods: **June-July** (summer), **December** (winter holidays) and, for cancellations only, **February**. June and July have the highest mean departure delays (about 21 minutes) and on-time rates below 69%. December is the worst single month for punctuality (66.5% on time). In contrast, **September to November** is the best period, with September reaching 86.3% on time and a negative mean arrival delay. February has normal delays but the highest cancellation rate (5.1%) because of the blizzard. Using three panels with independent scales lets the three metrics be compared without one swamping the others."),
  P("**How it guides further analysis.** Month (or season) must be included in any delay model. The summer peak is not explained by snow, which points towards thunderstorms and higher summer traffic volumes as causes to investigate."),

  H2("7.4 Time series: daily cancellation rate"),
  ...CODE(`ggplot(daily, aes(date, cancel_pct)) +
  geom_line(colour = "grey40") +
  geom_hline(yintercept = mean(daily$cancel_pct) + 3 * sd(daily$cancel_pct),
             linetype = "dashed") +
  geom_point(data = labs_df, shape = 21, fill = "white") +
  geom_text(data = labs_df, aes(label = lbl), vjust = -0.9)`),
  ...FIGURE("fig05_daily_cancellations.png", "Figure 5. Daily cancellation rate with anomalies above the 3-standard-deviation threshold labelled"),
  P("**What it reveals.** On most days fewer than 5% of flights are cancelled, but the series is punctuated by sharp, isolated spikes. The February blizzard towers over everything else at above 50%. A cluster of spikes in December and others in late May and mid-September also cross the anomaly line. These spikes explain why the monthly cancellation rate in Figure 4 jumps in February and December: a single bad day can double a month's figure."),
  P("**How it guides further analysis.** Cancellations are driven by rare, event-level shocks rather than steady daily variation. They should be analysed by joining external event data (storm warnings, airport closures) rather than by averaging. For a predictive model, these days may need separate treatment so they do not distort the patterns for normal days."),

  H2("7.5 Heat map: departure delay by weekday and hour"),
  ...CODE(`heat <- completed %>% filter(hour >= 5, hour <= 23) %>%
  group_by(weekday, hour) %>% summarise(mean_dep = mean(dep_delay))
ggplot(heat, aes(factor(hour), weekday, fill = mean_dep)) +
  geom_tile(colour = "white") +
  geom_text(aes(label = round(mean_dep))) +
  scale_fill_gradient(low = "grey97", high = "grey10")`),
  ...FIGURE("fig06_heatmap_weekday_hour.png", "Figure 6. Heat map of mean departure delay by weekday and scheduled departure hour"),
  P("**What it reveals.** The heat map shows the strongest and most consistent pattern in the whole dataset: **delays build up through the day**. Early-morning departures (5-7 am) average only 0-4 minutes of delay on every day of the week, while evening departures (5-9 pm) average 20-31 minutes. The supporting table shows the on-time rate falling from 89.5% at 5 am to 62.6% at 9 pm. This is the classic knock-on (propagation) effect: aircraft and crews fly several legs a day, and each delay is passed to the next flight. The worst cells are Thursday and Monday evenings (up to 31 minutes), while Saturday stays light throughout the day."),
  P("**How it guides further analysis.** Scheduled hour is probably the single most useful predictor of departure delay. The knock-on mechanism could be tested directly by linking consecutive flights flown by the same aircraft (tail number) and measuring how much of each delay is inherited from the previous leg. For travellers, the practical advice is simple: fly early in the day."),

  H2("7.6 Scatter plot: departure delay vs arrival delay"),
  ...CODE(`set.seed(2013)
samp <- completed %>% sample_n(20000)   # sample to avoid overplotting
ggplot(samp, aes(dep_delay, arr_delay)) +
  geom_point(alpha = 0.15, size = 0.6) +
  geom_abline(intercept = 0, slope = 1, linetype = "dotted") +
  geom_smooth(method = "lm", se = FALSE, colour = "black")
lm(arr_delay ~ dep_delay, data = completed)`),
  ...FIGURE("fig07_scatter_dep_vs_arr.png", "Figure 7. Scatter plot of departure delay against arrival delay, with fitted regression line"),
  P("**What it reveals.** The two delays are very strongly related, with a correlation of **r = 0.91**. A simple linear regression (fitted on all 327,346 flights, not only the plotted sample) gives arrival delay = -5.9 + 1.02 x departure delay, with R-squared = 0.84. In other words, departure delay alone explains 84% of the variation in arrival delay. The slope of almost exactly 1 means that once a flight leaves late, the delay is carried almost minute-for-minute to the destination. The intercept of about -6 minutes reflects schedule padding: airlines build a small buffer into scheduled flight times, so on-time departures tend to arrive slightly early. Points fall a little below the dotted 45-degree line, consistent with the typical in-flight gain of 7 minutes seen in Table 6."),
  P("**How it guides further analysis.** Because arrival delay is almost fully determined by departure delay, the real question is **what causes the departure delay**. Further work should focus on the ground side (hour, airport, carrier, weather and the incoming aircraft), and any model that predicts arrival delay must avoid using departure delay as an input if the goal is to forecast before take-off."),

  H2("7.7 Correlation heat map: delays and weather"),
  ...CODE(`wx <- c("dep_delay", "arr_delay", "temp", "dewp", "humid", "wind_speed",
        "precip", "pressure", "visib")
cm <- cor(completed[wx], use = "pairwise.complete.obs")
cm_long <- as.data.frame(as.table(cm))
ggplot(cm_long, aes(Var1, Var2, fill = Freq)) + geom_tile() +
  geom_text(aes(label = sprintf("%.2f", Freq))) +
  scale_fill_gradient2(low = "grey35", mid = "white", high = "black", midpoint = 0)`),
  ...FIGURE("fig08_correlation_heatmap.png", "Figure 8. Correlation matrix of delays and hourly weather variables at the origin airport", 5.6),
  P("**What it reveals.** Apart from the two delay variables with each other (0.91), all correlations between delay and weather are **weak**, in the range -0.14 to 0.14. The direction of each is sensible: higher humidity and precipitation go with longer delays, while higher pressure (fair weather) and better visibility go with shorter delays. The matrix also shows relationships among the weather variables themselves, such as temperature and dew point (0.88) and humidity and visibility (-0.54), which would cause multicollinearity if all were used in a regression together."),
  P("**How it guides further analysis.** Weak linear correlation does **not** mean weather is unimportant. Pearson correlation measures straight-line relationships across all hours, but most hours have perfect visibility and no rain, so the effect of bad weather is diluted. Bad weather is likely to have a threshold effect that only appears in a small number of hours. This was tested directly in Figure 9."),

  H2("7.8 Grouped bar chart: visibility and rainfall"),
  ...CODE(`wx_grp <- completed %>% filter(!is.na(visib), !is.na(precip)) %>%
  mutate(visib_band = cut(visib, c(-Inf, 1, 3, 5, 9.99, Inf),
           labels = c("< 1 mi", "1-3 mi", "3-5 mi", "5-10 mi", "10 mi (clear)")),
         rain = ifelse(precip > 0, "Rain in departure hour", "Dry departure hour")) %>%
  group_by(visib_band, rain) %>% summarise(mean_dep = mean(dep_delay))
ggplot(wx_grp, aes(visib_band, mean_dep, fill = rain)) +
  geom_col(position = position_dodge(width = 0.75), colour = "black")`),
  ...FIGURE("fig09_bar_weather_conditions.png", "Figure 9. Mean departure delay by visibility band and presence of rain"),
  P("**What it reveals.** When weather is grouped into categories, its effect becomes very clear. In clear, dry conditions the mean departure delay is **11 minutes**. When rain is recorded in the departure hour, the mean delay roughly **triples to 27-36 minutes** at every visibility level. Overall, the on-time rate drops from **77.2% in dry hours to 51.4% in rainy hours**. Low visibility (under 1 mile) also roughly doubles delay even without rain (28 minutes). This confirms the threshold effect suspected from Figure 8: weather matters a great deal, but only during the relatively few hours when it is bad (only 6% of flights departed in an hour with rain)."),
  P("**How it guides further analysis.** Weather should enter a model as categorical or threshold-based features (rain yes/no, low-visibility flag) rather than as raw continuous values. Because weather at the destination airport can also cause delays, a valuable next step would be to join destination weather as well."),
);

// 8. Findings
add(
  H1("8. Summary of Key Findings"),
  ...TABLE(["#", "Finding", "Evidence"], [
    ["1", "Delays are highly skewed: the typical flight is early, but a long tail of very late flights drives the average.", "Median -5 min vs mean 6.9 min; skewness 3.7 (Fig. 2)"],
    ["2", "Time of day is the strongest, most consistent driver: delays accumulate from morning to evening.", "0-4 min at 5-7 am vs 20-31 min at 5-9 pm (Fig. 6)"],
    ["3", "Arrival delay is almost fully inherited from departure delay.", "r = 0.91, slope 1.02, R-squared 0.84 (Fig. 7)"],
    ["4", "Strong seasonality: summer and December are worst, autumn is best.", "Sep 86% vs Dec 67% on time (Fig. 4)"],
    ["5", "Cancellations are driven by rare storm events, not everyday variation.", "8-9 Feb blizzard: over 50% cancelled (Fig. 5)"],
    ["6", "Rain and low visibility have a large threshold effect hidden by weak correlations.", "On time 77% dry vs 51% rain; r below 0.15 (Fig. 8, 9)"],
    ["7", "Large performance gaps between carriers, both in typical delay and in variability.", "On time from 61% (F9) to 87% (HA) (Fig. 3)"],
    ["8", "Newark has the longest delays; LaGuardia cancels the most.", "EWR 15.1 min dep. delay; LGA 3.0% cancelled (Table 9)"],
  ], [400, 5226, 3400], "Table 11. Key findings"),
);

// 9. Limitations
add(
  H1("9. Limitations"),
  B("**One year, one city.** The data covers only 2013 and only New York departures, so the seasonal pattern may partly reflect that year's specific weather events."),
  B("**Incomplete aircraft data.** 17% of flights could not be matched to the planes table, 83% of them from Envoy Air and American Airlines. I therefore did not draw conclusions about aircraft age; an initial grouping showed no clear relationship (mean arrival delay 3-9 minutes across age bands)."),
  B("**No delay-cause information.** The dataset does not include the BTS delay-cause fields (carrier, weather, air traffic control, late aircraft), which would allow the knock-on effect to be measured directly."),
  B("**Origin weather only.** Destination weather is not included, so some weather-related arrival delays are unexplained."),
  B("**Correlation is not causation.** The relationships identified here are descriptive. For example, evening flights are delayed more, but this analysis does not prove the mechanism; the propagation hypothesis needs to be tested."),
);

// 10. Next steps
add(
  H1("10. How These Insights Guide Further Analysis"),
  P("The EDA points to clear next steps for the following weeks of the internship:"),
  N("**Predictive model of delay.** Build a classification model (for example logistic regression or a random forest) to predict whether a flight will depart 15 or more minutes late, using scheduled hour, month, weekday, carrier, origin and threshold-based weather features. Departure delay itself must be excluded from the inputs.", "num2"),
  N("**Delay propagation analysis.** Order each aircraft's flights by time using tailnum and measure how much of a flight's delay is inherited from its previous leg.", "num2"),
  N("**Fair carrier comparison.** Compare carriers on the same routes and at the same hours to separate carrier performance from schedule effects.", "num2"),
  N("**Event-aware treatment.** Model extreme-weather days separately, or include a storm flag, so that a few days do not distort normal-day patterns.", "num2"),
  N("**Statistical testing.** Confirm the observed differences formally, e.g. a Kruskal-Wallis test for delay across carriers (suitable for skewed data) and a chi-square test of on-time rate by rain status.", "num2"),
);

// 11. Conclusion
add(
  H1("11. Conclusion"),
  P("This exploratory analysis took a raw, relational public dataset of more than 336,000 flights, audited and cleaned it, and used R to uncover the main patterns in New York flight punctuality. The cleaning stage showed that missing values were not random: they identified cancelled and diverted flights, and were therefore converted into a status flag rather than imputed. One impossible wind-speed reading was corrected, and two almost-empty columns were removed."),
  P("The exploratory analysis and nine visualizations show that flight delays are highly skewed, that they build up steadily over the course of the day, that arrival delay is almost entirely inherited from departure delay, and that both season and short bursts of bad weather strongly affect performance. Weather looked unimportant when measured with simple correlations, but grouping it by threshold revealed that rain roughly triples average delay, which is a good example of why EDA should look at the data from more than one angle."),
  P("These insights translate directly into the design of a predictive model and further hypothesis tests, and the same methods (on-time KPIs, segmentation by time and resource, anomaly detection and threshold analysis of external factors) are directly applicable to delivery performance analysis in a manufacturing supply chain."),
);

// Appendix
add(
  H1("Appendix A. Project Structure and Reproducibility"),
  P("The project is organised as follows and is published to GitHub:"),
  ...CODE(`nyc-flights-eda/
|-- README.md
|-- run_all.R                       # runs the three scripts in order
|-- data/
|   |-- flights.csv.zip             # 336,776 flights (zipped)
|   |-- weather.csv, planes.csv, airlines.csv, airports.csv
|-- R/
|   |-- 01_load_and_clean.R
|   |-- 02_exploratory_analysis.R
|   |-- 03_visualizations.R
|-- outputs/
    |-- figures/                    # fig01 ... fig09 (PNG)
    |-- tables/                     # summary CSV tables
    |-- *_console.txt               # saved console output of each script`),
  P("To reproduce every number and chart in this report, open R in the project folder and run:"),
  ...CODE(`install.packages(c("dplyr", "tidyr", "ggplot2", "scales"))
source("run_all.R")`),
  P("GitHub repository: ______________________________________________ (add your repository link here)"),
  H1("Appendix B. References"),
  B("Wickham, H. (2021). nycflights13: Flights that Departed NYC in 2013. R package, CRAN."),
  B("US Bureau of Transportation Statistics. Airline On-Time Performance Data. https://www.transtats.bts.gov"),
  B("NOAA National Centers for Environmental Information. Integrated Surface Database (hourly weather)."),
  B("Wickham, H., Cetinkaya-Rundel, M. and Grolemund, G. (2023). R for Data Science, 2nd edition. O'Reilly."),
  B("Wickham, H. (2016). ggplot2: Elegant Graphics for Data Analysis. Springer."),
);

// ---------- document ----------
const doc = new Document({
  creator: "Prashansa Gharat",
  title: "Week 2 - Exploratory Data Analysis and Visualization",
  styles: {
    default: { document: { run: { font: FONT, size: 23 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: "000000" },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "000000" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, italics: true, font: FONT, color: "000000" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ...["num1", "num2"].map((r) => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL,
        text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Page ", PageNumber.CURRENT], size: 18 })] })] }) },
    children: body,
  }],
});

const out = path.join(ROOT, "report", "Week2_EDA_Report_Prashansa_Gharat.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log("Wrote", out); });
