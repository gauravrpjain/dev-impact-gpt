library(readr)
library(tidyverse)


#Defining functions
clean_text <- function(content){
  # Remove new lines
  cleaned_text <- gsub("\\n", " ", content)
  
  cleaned_text <- gsub("\\s+", " ",cleaned_text)
  
  # Insert space after a period if followed by a letter
  cleaned_text <- gsub("\\.([a-zA-Z])", ". \\1", cleaned_text)
  
  
  # Trim leading and trailing white spaces
  cleaned_text <- trimws(cleaned_text)
  
  # Convert text to lowercase
  cleaned_text <- tolower(cleaned_text)
  
  return(cleaned_text)
}

#Loading data

disclosure <- read_csv("C:/Users/gjain5/OneDrive - WBG/Desktop/dev-impact-gpt/scripts/IFC_disclosure_investment_11.2022.csv")

#cleaning and wrangling data

disclosure$url <- paste("https://disclosures.ifc.org/enterprise-search-results-home/",disclosure$`Project Number`)

disclosure$content <- sapply(disclosure$Impact,clean_text)

disclosure$date <- paste0(disclosure$`Country Description`,"; ",ifelse(disclosure$Sector=="other","other",substr(disclosure$Sector,8,nchar(disclosure$Sector))))

disclosure$thanks <- sapply(disclosure$`Project Description`,clean_text)

disclosure <- disclosure[,c("Project Number","Project Name","url","date","thanks","content")]

disclosure <- disclosure[!is.na(disclosure$content),]

disclosure$content_length <- nchar(disclosure$content)

names(disclosure) <- c("id","essay_title","essay_url","essay_date","essay_thanks","content","content_length")

write.csv(disclosure,file = "./disclosure.csv",fileEncoding = "UTF-8")

disclosure_out <- read_csv("C:/Users/gjain5/Downloads/disclosure_out.csv")
disclosure_out <- disclosure_out[,c("id","essay_title","essay_url","essay_date","essay_thanks","content","content_length","content_tokens","embedding")]
disclosure_out <- disclosure_out[!duplicated(disclosure_out$id),]
write.csv(disclosure_out,file = "./disclosure_out.csv",fileEncoding = "UTF-8",row.names = F)
