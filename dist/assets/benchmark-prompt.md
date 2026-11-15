# SQL correctness benchmark: six questions

You are taking a SQL correctness benchmark. Write one read-only SQLite query for each of the six tasks below.

## Rules

- Use only the schema belonging to the database named for each task. The financial and student_club databases are separate; never join across them.
- Use SQLite syntax. Each answer must be a single SELECT statement or a WITH statement ending in SELECT. Do not modify data or schema.
- Return exactly the requested columns, in the order requested. Do not add explanatory columns.
- Follow all specified date boundaries, filters, rounding, tie handling, and sorting.
- Preserve the intended grain. Avoid multiplying counts or sums when joining tables with multiple matching rows.
- Include zero-count or zero-spend entities when the question requires them.
- Base your answer on the question, evidence, and schema descriptions. Do not look up benchmark answers or reference SQL.
- This is a single-attempt, schema-only run: do not execute queries, use external tools, or ask follow-up questions. Make your best interpretation from the supplied information.
- Output valid JSON only: one object mapping the six question IDs (as strings) to SQL query strings. Include every ID exactly once. Do not include Markdown, explanations, or expected results.

Output shape (replace each placeholder with SQL):

```json
{
  "198": "YOUR_SQL_QUERY",
  "200": "YOUR_SQL_QUERY",
  "210": "YOUR_SQL_QUERY",
  "212": "YOUR_SQL_QUERY",
  "315": "YOUR_SQL_QUERY",
  "328": "YOUR_SQL_QUERY"
}
```

## Database schemas

The inline comments describe column meanings and example values. Example values are illustrative, not the complete set of values.

### financial

```sql
CREATE TABLE `account` (
    `account_id` INTEGER, -- the id of the account; example: [1, 2]
    `district_id` INTEGER, -- location of branch; example: [18, 1]
    `frequency` TEXT, -- frequency of the acount; example: ['POPLATEK MESICNE']
    `date` DATE, -- the creation date of the account; example: ['1995-03-24', '1993-02-26']
    PRIMARY KEY (`account_id`),
    FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`)
);

CREATE TABLE `card` (
    `card_id` INTEGER, -- id number of credit card; example: [1, 2]
    `disp_id` INTEGER, -- disposition id; example: [9, 19]
    `type` TEXT, -- type of credit card; example: ['gold', 'classic']
    `issued` DATE, -- the date when the credit card issued; example: ['1998-10-16', '1998-03-13']
    PRIMARY KEY (`card_id`),
    FOREIGN KEY (`disp_id`) REFERENCES `disp` (`disp_id`)
);

CREATE TABLE `client` (
    `client_id` INTEGER, -- the unique number; example: [1, 2]
    `gender` TEXT, -- example: ['F', 'M']
    `birth_date` DATE, -- birth date; example: ['1970-12-13', '1945-02-04']
    `district_id` INTEGER, -- location of branch; example: [18, 1]
    PRIMARY KEY (`client_id`),
    FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`)
);

CREATE TABLE `disp` (
    `disp_id` INTEGER, -- unique number of identifying this row of record; example: [1, 2]
    `client_id` INTEGER, -- id number of client; example: [1, 2]
    `account_id` INTEGER, -- id number of account; example: [1, 2]
    `type` TEXT, -- type of disposition; example: ['OWNER', 'DISPONENT']
    PRIMARY KEY (`disp_id`),
    FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`)
);

CREATE TABLE `district` (
    `district_id` INTEGER, -- location of branch; example: [1, 2]
    `A2` TEXT, -- district_name; example: ['Hl.m. Praha', 'Benesov']
    `A3` TEXT, -- region; example: ['Prague', 'central Bohemia']
    `A4` TEXT, -- number of inhabitants; example: ['1204953', '88884']
    `A5` TEXT, -- municipality < district < region; example: ['0', '80']
    `A6` TEXT, -- municipality < district < region; example: ['0', '26']
    `A7` TEXT, -- municipality < district < region; example: ['0', '6']
    `A8` INTEGER, -- municipality < district < region; example: [1, 2]
    `A9` INTEGER, -- example: [1, 5]
    `A10` REAL, -- ratio of urban inhabitants; example: [100.0, 46.7]
    `A11` INTEGER, -- average salary; example: [12541, 8507]
    `A12` REAL, -- unemployment rate 1995; example: [0.2, 1.6]
    `A13` REAL, -- unemployment rate 1996; example: [0.43, 1.85]
    `A14` INTEGER, -- no. of entrepreneurs per 1000 inhabitants; example: [167, 132]
    `A15` INTEGER, -- no. of committed crimes 1995; example: [85677, 2159]
    `A16` INTEGER, -- no. of committed crimes 1996; example: [99107, 2674]
    PRIMARY KEY (`district_id`)
);

CREATE TABLE `loan` (
    `loan_id` INTEGER, -- the id number identifying the loan data; example: [4959, 4961]
    `account_id` INTEGER, -- the id number identifying the account; example: [2, 19]
    `date` DATE, -- the date when the loan is approved; example: ['1994-01-05', '1996-04-29']
    `amount` INTEGER, -- approved amount; example: [80952, 30276]
    `duration` INTEGER, -- loan duration; example: [24, 12]
    `payments` REAL, -- monthly payments; example: [3373.0, 2523.0]
    `status` TEXT, -- repayment status; example: ['A', 'B']
    PRIMARY KEY (`loan_id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`)
);

CREATE TABLE `order` (
    `order_id` INTEGER, -- identifying the unique order; example: [29401, 29402]
    `account_id` INTEGER, -- id number of account; example: [1, 2]
    `bank_to` TEXT, -- bank of the recipient; example: ['YZ', 'ST']
    `account_to` INTEGER, -- account of the recipient; example: [87144583, 89597016]
    `amount` REAL, -- debited amount; example: [2452.0, 3372.7]
    `k_symbol` TEXT, -- purpose of the payment; example: ['SIPO', 'UVER']
    PRIMARY KEY (`order_id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`)
);

CREATE TABLE `trans` (
    `trans_id` INTEGER, -- transaction id; example: [1, 5]
    `account_id` INTEGER, -- example: [1]
    `date` DATE, -- date of transaction; example: ['1995-03-24', '1995-04-13']
    `type` TEXT, -- +/- transaction; example: ['PRIJEM']
    `operation` TEXT, -- mode of transaction; example: ['VKLAD', 'PREVOD Z UCTU']
    `amount` INTEGER, -- amount of money; example: [1000, 3679]
    `balance` INTEGER, -- balance after transaction; example: [1000, 4679]
    `k_symbol` TEXT, -- characterization of the transaction; example: []
    `bank` TEXT, -- bank of the partner; example: ['AB']
    `account` INTEGER, -- account of the partner; example: [41403269]
    PRIMARY KEY (`trans_id`),
    FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`)
);
```

### student_club

```sql
CREATE TABLE `event` (
    `event_id` TEXT, -- A unique identifier for the event; example: ['rec0Si5cQ4rJRVzd6', 'rec0akZnLLpGUloLH']
    `event_name` TEXT, -- event name; example: ['March Meeting', 'Officers meeting - January']
    `event_date` TEXT, -- The date the event took place or is scheduled to take place; example: ['2020-03-10T12:00:00', '2020-01-14T09:30:00']
    `type` TEXT, -- The kind of event, such as game, social, election; example: ['Meeting', 'Election']
    `notes` TEXT, -- A free text field for any notes about the event; example: ['All active members can vote for new officers between 4pm-8pm.', "Attend Women's soccer game as a group."]
    `location` TEXT, -- Address where the event was held or is to be held or the name of such a location; example: ['MU 215', 'Campus Soccer/Lacrosse stadium']
    `status` TEXT, -- One of three values indicating if the event is in planning, is opened, or is closed; example: ['Open', 'Planning']
    PRIMARY KEY (`event_id`)
);

CREATE TABLE `major` (
    `major_id` TEXT, -- A unique identifier for each major; example: ['rec06DF6vZ1CyPKpc', 'rec09LedkREyskCNv']
    `major_name` TEXT, -- major name; example: ['Outdoor Product Design and Development', 'Agricultural Communication']
    `department` TEXT, -- The name of the department that offers the major; example: ['School of Applied Sciences, Technology and Education', 'Watershed Sciences Department']
    `college` TEXT, -- The name college that houses the department that offers the major; example: ['College of Agriculture and Applied Sciences', 'College of Natural Resources']
    PRIMARY KEY (`major_id`)
);

CREATE TABLE `zip_code` (
    `zip_code` INTEGER, -- The ZIP code itself. A five-digit number identifying a US post office.; example: [501, 544]
    `type` TEXT, -- The kind of ZIP code; example: ['Unique', 'Standard']
    `city` TEXT, -- The city to which the ZIP pertains; example: ['Holtsville', 'Adjuntas']
    `county` TEXT, -- The county to which the ZIP pertains; example: ['Suffolk County', 'Adjuntas Municipio']
    `state` TEXT, -- The name of the state to which the ZIP pertains; example: ['New York', 'Puerto Rico']
    `short_state` TEXT, -- The abbreviation of the state to which the ZIP pertains; example: ['NY', 'PR']
    PRIMARY KEY (`zip_code`)
);

CREATE TABLE `attendance` (
    `link_to_event` TEXT, -- The unique identifier of the event which was attended; example: ['rec2N69DMcrqN9PJC']
    `link_to_member` TEXT, -- The unique identifier of the member who attended the event; example: ['recD078PnS3x2doBe', 'recP6DJPyi5donvXL']
    PRIMARY KEY (`link_to_event`, `link_to_member`),
    FOREIGN KEY (`link_to_member`) REFERENCES `member` (`member_id`),
    FOREIGN KEY (`link_to_event`) REFERENCES `event` (`event_id`)
);

CREATE TABLE `budget` (
    `budget_id` TEXT, -- A unique identifier for the budget entry; example: ['rec0QmEc3cSQFQ6V2', 'rec1bG6HSft7XIvTP']
    `category` TEXT, -- The area for which the amount is budgeted, such as, advertisement, food, parking; example: ['Advertisement', 'Food']
    `spent` REAL, -- The total amount spent in the budgeted category for an event.; example: [67.81, 121.14]
    `remaining` REAL, -- A value calculated as the amount budgeted minus the amount spent; example: [7.19, 28.86]
    `amount` INTEGER, -- The amount budgeted for the specified category and event; example: [75, 150]
    `event_status` TEXT, -- the status of the event; example: ['Closed', 'Open']
    `link_to_event` TEXT, -- The unique identifier of the event to which the budget line applies.; example: ['recI43CzsZ0Q625ma', 'recggMW2eyCYceNcy']
    PRIMARY KEY (`budget_id`),
    FOREIGN KEY (`link_to_event`) REFERENCES `event` (`event_id`)
);

CREATE TABLE `expense` (
    `expense_id` TEXT, -- unique id of income; example: ['rec017x6R3hQqkLAo', 'rec1nIjoZKTYayqZ6']
    `expense_description` TEXT, -- A textual description of what the money was spend for; example: ['Post Cards, Posters', 'Water, Cookies']
    `expense_date` TEXT, -- The date the expense was incurred; example: ['2019-08-20', '2019-10-08']
    `cost` REAL, -- The dollar amount of the expense; example: [122.06, 20.2]
    `approved` TEXT, -- A true or false value indicating if the expense was approved; example: ['true']
    `link_to_member` TEXT, -- The member who incurred the expense; example: ['rec4BLdZHS2Blfp4v', 'recro8T1MPMwRadVH']
    `link_to_budget` TEXT, -- The unique identifier of the record in the Budget table that indicates the expected total expenditure for a given catego; example: ['recvKTAWAFKkVNnXQ', 'recy8KY5bUdzF81vv']
    PRIMARY KEY (`expense_id`),
    FOREIGN KEY (`link_to_member`) REFERENCES `member` (`member_id`),
    FOREIGN KEY (`link_to_budget`) REFERENCES `budget` (`budget_id`)
);

CREATE TABLE `income` (
    `income_id` TEXT, -- A unique identifier for each record of income; example: ['rec0s9ZrO15zhzUeE', 'rec7f5XMQZexgtQJo']
    `date_received` TEXT, -- the date that the fund received; example: ['2019-10-17', '2019-09-04']
    `amount` INTEGER, -- amount of funds; example: [50]
    `source` TEXT, -- A value indicating where the funds come from such as dues, or the annual university allocation; example: ['Dues']
    `notes` TEXT, -- A free-text value giving any needed details about the receipt of funds; example: []
    `link_to_member` TEXT, -- link to member; example: ['reccW7q1KkhSKZsea', 'recTjHY5xXhvkCdVT']
    PRIMARY KEY (`income_id`),
    FOREIGN KEY (`link_to_member`) REFERENCES `member` (`member_id`)
);

CREATE TABLE `member` (
    `member_id` TEXT, -- unique id of member; example: ['rec1x5zBFIqoOuPW8', 'rec280Sk7o31iG0Tx']
    `first_name` TEXT, -- member's first name; example: ['Angela', 'Grant']
    `last_name` TEXT, -- member's last name; example: ['Sanders', 'Gilmour']
    `email` TEXT, -- member's email; example: ['angela.sanders@lpu.edu', 'grant.gilmour@lpu.edu']
    `position` TEXT, -- The position the member holds in the club; example: ['Member', 'Inactive']
    `t_shirt_size` TEXT, -- The size of tee shirt that member wants when shirts are ordered; example: ['Medium', 'X-Large']
    `phone` TEXT, -- The best telephone at which to contact the member; example: ['(651) 928-4507', '403-555-1310']
    `zip` INTEGER, -- the zip code of the member's hometown; example: [55108, 29440]
    `link_to_major` TEXT, -- The unique identifier of the major of the member. References the Major table; example: ['recxK3MHQFbR9J5uO', 'rec7BxKpjJ7bNph3O']
    PRIMARY KEY (`member_id`),
    FOREIGN KEY (`zip`) REFERENCES `zip_code` (`zip_code`),
    FOREIGN KEY (`link_to_major`) REFERENCES `major` (`major_id`)
);
```

## Questions

### Question 198 — database: financial

For accounts opened from 1995 through 2000 in East Bohemia districts, list each account ID and its statement-issuance frequency.

Evidence: None supplied.

### Question 200 — database: financial

For each account-disposition type other than OWNER found in districts with average salary above 8000 and at most 9000, give the type and the number of distinct associated accounts.

Evidence: None supplied.

### Question 210 — database: financial

I'm preparing for a client review and want to gauge how indebted our older customers' accounts are, including accounts that never took any loans. Could you give me the average number of loans per account among accounts whose owner was born before 1950? By 'born before 1950' I mean a birth date earlier than 1 January 1950, and all loans should count regardless of when they were approved. Please give me the average rounded to two decimal places, and nothing else.

Evidence: The owner of an account is the client with the OWNER disposition; a DISPONENT is a co-holder who does not own it. A loan is a credit granted on the account, recorded with the date it was approved.

### Question 212 — database: financial

I want to find out whether our borrowing households from larger population centres transact differently from local ones. For every account at the Prachatice branch that has taken at least one loan, please give me: the account number, the account opening date, the total amount ever borrowed, how many outside bank counterparties the account has transacted with over its entire history, the owner's home district, the population of that district, and a rank of these borrowing households by home-district population from largest to smallest. Note that a counterparty means a particular bank account at another institution, identified by that account number, not by the bank code, and only transfers to or from another bank count — handling cash at our own branch does not involve a counterparty. A household's home district is the district its owner client is registered in, which is not necessarily Prachatice. For the ranking: largest population first, ties share the same rank and the next rank after a tie is skipped, and among households whose home districts have the same population, list the smaller account number first.

Evidence: An outside bank counterparty is a bank account at another institution that money was sent to or received from on a transfer transaction. District population is the number of inhabitants of the district.

### Question 315 — database: student_club

For every event in our records that had at least one attendee, I need the amount spent per attendee on bottled drinking water, in dollars and cents rounded to two decimals. Give me one row per event with the event name and that amount; if an attended event had no water purchases, show 0.00, and if two events share a name, list them separately. Include all events regardless of status, across the club's entire history. A purchase that included water along with other items counts fully toward water.

Evidence: water: bottled drinking water bought for attendees

### Question 328 — database: student_club

For every event in the club's records, can you give me the event name, event date, total amount budgeted for the event, and the number of members who attended it? Please sort the list by event name, then by event date, both in ascending order.

Evidence: None supplied.

