# Lab 3: Mayoral Mystery

The goals for this tutorial are:

- to experiment working with maps and geospatial data
- to build data exploration skillsets with ambiguity
- to iterate with visualizations to discover data insights
- to hone the data → visualization workflow

The assignment requirements are as follows:

1. Create a dashboard in the `index.md` file using the data provided in the `/data` folder. Please also include written context for the answers that is supported by visualizations.
2. Create **at least two, but no more than four visualizations** with Observable Plot (or d3, if you feel ready for that, but not recommended). 
3. One of your visualizations **should be a map of the nyc districts** with some data visualized. That data can be points on the map, or a choropleth. The `index.md` file has some initial work for the geoJSON data to get you started. 
4. This lab is different in that **you are not obligated to answer any data questions in particular**, but some relevant insights do exist. Since this lab has less structure, here are some questions that you may explore to get you started if you feel lost: 
   - How did the candidate do, overall? How do the results vary by district? By income level?
   - How did people feel about the issues? What other information do the survey responses tell us?
   - What was the extent of the Get Out The Vote campaign? Was it successful?
   - This candidate would like to run again. What would you suggest for a successful next campaign?
5. Submit your [deployed link](#4-set-up-your-github-pages-for-your-deployment) as a comment on the lab 3 commons post.


Since this lab doesn't have a set slate of research questions, take time to understand the data, consider what you think is important context for the staff, and present it thougtfully and clearly. As mentioned in the syllabus (pdf in the home page of [commons](https://data73200fall2025.commons.gc.cuny.edu/)), for labs 3 and 4, you will be graded on:
- On time submission 
- Technical requirements met
- Thoughtful responses to research questions (if applicable)
- Well articulated data presentations (_new_)
- Design considerations (_new_)

---

# Data Context

A political campaign has collected data from their recent election cycle and needs analysis to understand their performance. The campaign ran from May through November 2024 across New York City's borough-community districts. The candidate had some exiting momentum, and would like to run again. The campaign needs to know areas in which they succeeded, and areas where they could make changes for next time.

Some notes: 
- Borough-community districts (boro_cd) are coded as 3-digit numbers where the first digit represents the borough (1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island)
- Income categories are derived from median household income: Low (<$50,000), Middle ($50,000-$100,000), High (>$100,000)
- Survey responses include both voters and non-voters, with open-ended feedback on campaign effectiveness

The data has been provided in multiple datasets as CSV files, along with a topojson file of NYC districts. 

## NYC TopoJSON 

There is a [topoJSON](https://github.com/topojson/topojson?tab=readme-ov-file#topojson) file called `nyc.json` in the data folder. This file is a simplified version of the NYC voting districts geoJSON sourced from NYC open data. Debugging and projecting this data can be fairly advanced, so the file is already imported, converted to geoJSON, and rendered in a plot in the `index.md` file for you. To make a visualization of this map, you can expand on the existing plot by changing the `Plot.geo` mark or adding more marks in addition. 

## Campaign Datasets

### campaign_events.csv (May - November 2024)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **event_id** | Integer | 1-130 | Unique identifier for each event |
| **boro_cd** | Integer | 101-503 | Borough-community district code |
| **income_category** | Categorical | Low, Middle, High | Income classification of the district |
| **event_type** | Categorical | 6 types | Community Meeting, Volunteer Training, Rally, Roundtable, Town Hall, Canvassing Kickoff |
| **event_date** | Date | 2024-05-01 to 2024-11-02 | Date the event was held |
| **latitude** | Numeric | 40.58-40.90 | Geographic latitude of event location |
| **longitude** | Numeric | -74.15 to -73.74 | Geographic longitude of event location |
| **estimated_attendance** | Integer | 33-296 | Number of attendees at the event |

### survey_responses.csv (Post-Election Survey)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **respondent_id** | Integer | 1-100 | Unique identifier for each respondent |
| **boro_cd** | Integer | 101-503 | Borough-community district of respondent |
| **age** | Integer | 25-74 | Age of respondent |
| **heard_of_candidate** | Categorical | Yes, No | Whether respondent was aware of the candidate |
| **affordable_housing_alignment** | Integer | 1-5 | Agreement with candidate's housing policy (1=strongly disagree, 5=strongly agree) |
| **public_transit_alignment** | Integer | 1-5 | Agreement with candidate's transit policy |
| **childcare_support_alignment** | Integer | 1-5 | Agreement with candidate's childcare policy |
| **small_business_tax_alignment** | Integer | 1-5 | Agreement with candidate's small business policy |
| **police_reform_alignment** | Integer | 1-5 | Agreement with candidate's police reform policy |
| **voted** | Categorical | Yes, No | Whether respondent voted in the election |
| **voted_for** | Categorical | Candidate, Opponent, blank | Who the respondent voted for (if applicable) |
| **open_response** | Text | Free text | Optional feedback about the campaign |

### election_results.csv (Election Results by District)
| Column Name | Type | Range/Values | Description |
|-------------|------|--------------|-------------|
| **boro_cd** | Integer | 101-503 | Borough-community district code |
| **median_household_income** | Integer | $34,560-$142,890 | Median household income in the district |
| **income_category** | Categorical | Low, Middle, High | Income classification of the district |
| **total_registered_voters** | Integer | 30,366-49,906 | Number of registered voters in the district |
| **votes_candidate** | Integer | 7,394-21,328 | Votes received by the candidate |
| **votes_opponent** | Integer | 4,963-28,347 | Votes received by the opponent |
| **turnout_rate** | Numeric | 39.56%-84.92% | Percentage of registered voters who voted |
| **gotv_doors_knocked** | Integer | 108-7,940 | Number of doors knocked for Get Out The Vote efforts |
| **candidate_hours_spent** | Integer | 1-28 | Hours the candidate personally spent in the district |