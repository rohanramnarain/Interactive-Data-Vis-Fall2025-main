# Lab 2: Subway Staffing

The goals for this tutorial are:

- to build upon importing data, and leverage more than one dataset
- to explore more [transforms](https://observablehq.com/plot/features/transforms) with Observable Plot
- to iterate with visualizations to answer data questions

The assignment requirements are as follows:

1. Create a dashboard in the `index.md` file that answers (at least the first) three questions posed in the lab below. Please also include written context for the answers that is supported by visualizations. 
2. Use **at least one transform** in a plot you create. We've used `bin` and `group`, but there's more options like `centroid`, `dodge`, `hexbin`, etc. Try to get creative, but of course, you're only limited to what the data, scales, and marks allow. 
3. Use **at least one annotation** on a visualization to illustrate something of note. This could be a moment in time, or a statistical detail (mean, median), or a [tip mark callout](https://observablehq.com/plot/marks/tip#tip-mark).
3. Submit your [deployed link](#4-set-up-your-github-pages-for-your-deployment) as a comment on the lab 2 commons post.

Some tips for this assignment: 

- You shouldn't have to use `<scripts>` or import any languages that we don't already have access to. (Note: if you use d3 for color or data manipulation, thats ok, just don't use d3 for creating visuals)
- You can use HTML within the scope of what Framework has outlined for us. You can write HTML directly in your md file -- you shouldn't have to do anything fancy. 


---

# Data Context

The NYC Transit Authority has collected operational data from their Manhattan subway stations and needs your help to make critical staffing decisions for next summer. They are planning for a busy event season in 2026 and want to ensure they have adequate staff at the right stations. 

Some notes: 
- While the incident detail isn't included, you do have access to the incident severity.
- There was a subway fare price change from $2.75 to $3.00 on July 15th. 
- The events data includes a nearby station where the traffic can typucally be attributed to. 
- Current staffing numbers for the relevant subway stations are as follows, which could be relevant in your analysis: 
    ```
    {
      "Times Sq-42 St": 19,
      "Grand Central-42 St": 18,
      "34 St-Penn Station": 15,
      "14 St-Union Sq": 4,
      "Fulton St": 17,
      "42 St-Port Authority": 14,
      "Herald Sq-34 St": 15,
      "Canal St": 4,
      "59 St-Columbus Circle": 6,
      "125 St": 7,
      "96 St": 19,
      "86 St": 19,
      "72 St": 10,
      "66 St-Lincoln Center": 15,
      "50 St": 20,
      "28 St": 13,
      "23 St": 8,
      "Christopher St": 15,
      "Houston St": 18,
      "Spring St": 12,
      "Chambers St": 18,
      "Wall St": 9,
      "Bowling Green": 6,
      "West 4 St-Wash Sq": 4,
      "Astor Pl": 7
    }
    ```

Specifically, your dashboard should answer:

1. How did local events impact ridership in summer 2025? What effect did the July 15th fare increase have?
2. How do the stations compare when it comes to response time? Which are the best, which are the worst? 
3. Which three stations need the most staffing help for next summer based on the 2026 event calendar?
4. [BONUS] If you had to prioritize _one_ station to get increased staffing, which would it be and why?

The data could yield additional interesting trends, but these questions are the most important. The data has been provided in multiple datasets, all in the `/data` folder.

## NYC Subway Operations Datasets

### local_events.csv (Summer 2025)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **date** | Date | 2025-06-01 to 2025-08-14 | Date of the event |
| **event_name** | Categorical | Various | Type of event (concerts, festivals, etc.) |
| **nearby_station** | Categorical | 25 stations | Subway station nearest to the event |
| **estimated_attendance** | Integer | 500-15,000 | Actual attendance at the event |

### upcoming_events.csv (Summer 2026 - Planning)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **date** | Date | 2026-06-01 to 2026-08-14 | Date of the planned event |
| **event_name** | Categorical | Various | Type of event (concerts, festivals, etc.) |
| **nearby_station** | Categorical | 25 stations | Subway station nearest to the event |
| **expected_attendance** | Integer | 500-15,000 | Projected attendance at the event |

### incidents.csv (10 Years of Historical Data)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **date** | Date | 2015-01-01 to 2025-08-14 | Date of the incident |
| **station** | Categorical | 25 stations | Subway station where incident occurred |
| **severity** | Categorical | low, medium, high | Severity level of the incident |
| **staffing_count** | Integer | 3-20 | Number of staff on duty at the time |
| **response_time_minutes** | Numeric | 2-25 minutes | Time to respond to the incident |

### ridership.csv (Summer 2025)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **date** | Date | 2025-06-01 to 2025-08-14 | Date of ridership count |
| **station** | Categorical | 25 stations | Subway station |
| **entrances** | Integer | 2,000-27,000+ | Number of people entering the station |
| **exits** | Integer | 2,000-27,000+ | Number of people exiting the station |


