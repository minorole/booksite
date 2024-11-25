# Function Calling Documentation

## Introduction

Function calling allows you to connect language models to external tools with function calling.

Function calling is useful for a large number of use cases, such as:

1. **Enabling assistants to fetch data**: an AI assistant needs to fetch the latest customer data from an internal system when a user asks "what are my recent orders?" before it can generate the response to the user

2. **Enabling assistants to take actions**: an AI assistant needs to schedule meetings based on user preferences and calendar availability.

3. **Enabling assistants to perform computation**: a math tutor assistant needs to perform a math computation.

4. **Building rich workflows**: a data extraction pipeline that fetches raw text, then converts it to structured data and saves it in a database.

5. **Modifying your applications' UI**: you can use function calls that update the UI based on user input, for example, rendering a pin on a map.

## The Lifecycle of a Function Call

When you use the OpenAI API with function calling, the model never actually executes functions itself, instead in step 3 the model simply generates parameters that can be used to call your function, which your code can then choose how to handle, likely by calling the indicated function. Your application is always in full control.

Function calling is supported in both the Chat Completions API, Assistants API, and the Batch API. This guide focuses on function calling using the Chat Completions API.

## How to Use Function Calling

For the following example, we are building a conversational assistant which is able to help users with their delivery orders. Rather than requiring your users to interact with a typical form, your user can chat with an AI-powered assistant. In order to make this assistant helpful, we want to give it the ability to look up orders and reply with real data about the user's orders.

### Step 1: Pick a function in your codebase that the model should be able to call

The starting point for function calling is choosing a function in your own codebase that you'd like to enable the model to generate arguments for.

For this example, let's imagine you want to allow the model to call the `get_delivery_date` function in your codebase which accepts an `order_id` and queries your database to determine the delivery date for a given package. Your function might look like something like the following:

```javascript
// This is the function that we want the model to be able to call
const getDeliveryDate = async (orderId: string): datetime => { 
  const connection = await createConnection({
    host: 'localhost',
    user: 'root',
    // ...
  });
}
```

### Step 2: Describe your function to the model

Now we know what function we wish to allow the model to call, we will create a "function definition" that describes the function to the model. This definition describes both what the function does (and potentially when it should be called) and what parameters are required to call the function.

The `parameters` section of your function definition should be described using JSON Schema. If and when the model generates a function call, it will use this information to generate arguments according to your provided schema.

In this example it may look like this:

```json
{
  "name": "get_delivery_date",
  "description": "Get the delivery date for a customer's order. Call this whenever a customer asks about the delivery date of their order.",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "The customer's order ID."
      }
    },
    "required": ["order_id"],
    "additionalProperties": false
  }
}
```

### Step 3: Pass your function definitions as available "tools" to the model, along with the messages

Next we need to provide our function definitions within an array of available "tools" when calling the Chat Completions API.

As always, we will provide an array of "messages", which could for example contain your prompt or a whole back and forth conversation between the user and an assistant.

This example shows how you may call the Chat Completions API providing relevant functions and messages for an assistant that handles customer inquiries for a store:

```javascript
const tools = [
  {
    type: "function",
    function: {
      name: "get_delivery_date",
      description: "Get the delivery date for a customer's order. Call this when user asks when their order will arrive.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The customer's order ID."
          }
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    }
  },
];

const messages = [];
messages.push({ role: "system", content: "You are a helpful customer support assistant." });
messages.push({ role: "user", content: "When will my order be delivered?" });

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools,
});
```
# Function Calling Documentation (Continued)

### Step 4: Receive and handle the model response

#### If the model decides that no function should be called

If the model does not generate a function call, then the response will contain a direct reply to the user in the normal way that Chat Completions does.

For example, in this case `chat_response.choices[0].message` may contain:

```javascript
{
  role: 'assistant',
  content: "I'd be happy to help with that. Could you please provide me with your order ID?"
}
```

In an assistant use case you will typically want to show this response to the user and let them respond to it, in which case you will call the API again (with both the latest responses from the assistant and user appended to the messages).

#### If the model generated a function call

If the model generated a function call, it will generate the arguments for the call (based on the parameters definition you provided).

Here is an example response showing this:

```javascript
{
  finish_reason: 'tool_calls',
  index: 0,
  logprobs: null,
  message: {
    content: null,
    role: 'assistant',
    function_call: null,
    tool_calls: [
      {
        id: 'call_62136354',
        function: {
          arguments: '{"order_id":"order_12345"}',
          name: 'get_delivery_date'
        },
        type: 'function'
      }
    ]
  }
}
```

#### Handling the model response indicating that a function should be called

Assuming the response indicates that a function should be called, your code will now handle this:

```javascript
// Extract the arguments for get_delivery_date
// Note this code assumes we have already determined that the model generated a function call
const toolCall = response.choices[0].message.tool_calls[0];
const arguments = JSON.parse(toolCall.function.arguments);
const order_id = arguments.order_id;

// Call the get_delivery_date function with the extracted order_id
const delivery_date = get_delivery_date(order_id);
```

### Step 5: Provide the function call result back to the model

Now we have executed the function call locally, we need to provide the result of this function call back to the Chat Completions API so the model can generate the actual response that the user should see:

```javascript
// Create a message containing the result of the function call
const function_call_result_message = {
  role: "tool",
  content: JSON.stringify({
    order_id: order_id,
    delivery_date: delivery_date.format('YYYY-MM-DD HH:mm:ss')
  }),
  tool_call_id: response.choices[0].message.tool_calls[0].id
};

// Prepare the chat completion call payload 
const completion_payload = {
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful customer support assistant." },
    { role: "user", content: "When will my order be delivered?" },
    response.choices[0].message,
    function_call_result_message
  ]
};

// Call the OpenAI API's chat completions endpoint to send the tool call result back
const final_response = await openai.chat.completions.create({
  model: completion_payload.model,
  messages: completion_payload.messages
});
```

## Understanding Token Usage

Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means functions count against the model's context limit and are billed as input tokens. If you run into token limits, we suggest limiting the number of functions or the length of the descriptions you provide for function parameters.

It is also possible to use fine-tuning to reduce the number of tokens used if you have many functions defined in your tools specification.

## Tips and Best Practices

### Turn on Structured Outputs by setting `strict: "true"`

When Structured Outputs is turned on, the arguments generated by the model for function calls will reliably match the JSON Schema that you provide.

If you are not using Structured Outputs, then the structure of arguments is not guaranteed to be correct, so we recommend the use of a validation library like Pydantic to first verify the arguments prior to using them.

### Name functions intuitively, with detailed descriptions

If you find the model does not generate calls to the correct functions, you may need to update your function names and descriptions so the model more clearly understands when it should select each function. Avoid using abbreviations or acronyms to shorten function and argument names.

You can also include detailed descriptions for when a tool should be called. For complex functions, you should include descriptions for each of the arguments to help the model know what it needs to ask the user to collect that argument.

### Name function parameters intuitively, with detailed descriptions

Use clear and descriptive names for function parameters. For example, specify the expected format for a date parameter (e.g., YYYY-mm-dd or dd/mm/yy) in the description.
# Function Calling Documentation (Continued)

### Use enums for function arguments when possible

If your use case allows, you can use enums to constrain the possible values for arguments. This can help reduce hallucinations.

For example, say you have an AI assistant that helps with ordering a T-shirt. You likely have a fixed set of sizes for the T-shirt, and you might want the model to output in a specific format.

If you want the model to output "s", "m", "l", etc for small, medium, and large, then you could provide those values in the enum, for example:

```json
{
  "name": "pick_tshirt_size",
  "description": "Call this if the user specifies which size t-shirt they want",
  "parameters": {
    "type": "object",
    "properties": {
      "size": {
        "type": "string",
        "enum": ["s", "m", "l"],
        "description": "The size of the t-shirt that the user would like to order"
      }
    },
    "required": ["size"],
    "additionalProperties": false
  }
}
```

If you don't constrain the output, a user may say "large" or "L", and the model may return either value. Your code may expect a specific structure, so it's important to limit the number of possible formats the model can choose from.

### Keep the number of functions low for higher accuracy

We recommend that you use no more than 20 functions in a single tool call. Developers typically see a reduction in the model's ability to select the correct tool once they have between 10-20 tools.

If your use case requires the model to be able to pick between a large number of functions, you may want to explore fine-tuning or break out the tools and group them logically to create a multi-agent system.

### Set up evals to act as an aid in prompt engineering your function definitions and system messages

We recommend for non-trivial uses of function calling that you set up a suite of evals that allow you to measure how frequently the correct function is called or correct arguments are generated for a wide variety of possible user messages.

You can then use these to measure whether adjustments to your function definitions and system messages will improve or hurt your integration.

### Fine-tuning may help improve accuracy for function calling

Fine-tuning a model can improve performance at function calling for your use case, especially if you have a large number of functions, or complex, nuanced or similar functions.

## Parallel Function Calling and Structured Outputs

When the model outputs multiple function calls via parallel function calling, model outputs may not match strict schemas supplied in tools.

In order to ensure strict schema adherence, disable parallel function calls by supplying `parallel_tool_calls: false`. With this setting, the model will generate one function call at a time.

## FAQ

### How do functions differ from tools?

When using function calling with the OpenAI API, you provide them as `tools`, configure them with `tool_choice` and monitor for `finish_reason: "tool_calls"`.

The parameters named things like `functions` and `function_call` etc are now deprecated.

### Should I include function call instructions in the tool specification or in the system prompt?

We recommend including instructions regarding when to call a function in the system prompt, while using the function definition to provide instructions on how to call the function and how to generate the parameters.

### Which models support function calling?

Function calling was introduced with the release of gpt-4-turbo on June 13, 2023. This includes: gpt-4o, gpt-4o-2024-08-06, gpt-4o-2024-05-13, gpt-4o-mini, gpt-4o-mini-2024-07-18, gpt-4-turbo, gpt-4-turbo-2024-04-09, gpt-4-turbo-preview, gpt-4-0125-preview, gpt-4-1106-preview, gpt-4, gpt-4-0613, gpt-3.5-turbo, gpt-3.5-turbo-0125, gpt-3.5-turbo-1106, and gpt-3.5-turbo-0613.

Legacy models released before this date were not trained to support function calling.

Parallel function calling is supported on models released on or after Nov 6, 2023. This includes: gpt-4o, gpt-4o-2024-08-06, gpt-4o-2024-05-13, gpt-4o-mini, gpt-4o-mini-2024-07-18, gpt-4-turbo, gpt-4-turbo-2024-04-09, gpt-4-turbo-preview, gpt-4-0125-preview, gpt-4-1106-preview, gpt-3.5-turbo, gpt-3.5-turbo-0125, and gpt-3.5-turbo-1106.

# How to Call Functions with Chat Models

This notebook covers how to use the Chat Completions API in combination with external functions to extend the capabilities of GPT models.

## Overview

This notebook contains the following 2 sections:
- How to generate function arguments: Specify a set of functions and use the API to generate function arguments.
- How to call functions with model generated arguments: Close the loop by actually executing functions with model generated arguments.

## Basic Setup

```python
import json
from openai import OpenAI
from tenacity import retry, wait_random_exponential, stop_after_attempt
from termcolor import colored 

GPT_MODEL = "gpt-4o"
client = OpenAI()

@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(3))
def chat_completion_request(messages, tools=None, tool_choice=None, model=GPT_MODEL):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
        )
        return response
    except Exception as e:
        print("Unable to generate ChatCompletion response")
        print(f"Exception: {e}")
        return e

def pretty_print_conversation(messages):
    role_to_color = {
        "system": "red",
        "user": "green",
        "assistant": "blue",
        "function": "magenta",
    }
    
    for message in messages:
        if message["role"] == "system":
            print(colored(f"system: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "user":
            print(colored(f"user: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "assistant" and message.get("function_call"):
            print(colored(f"assistant: {message['function_call']}\n", role_to_color[message["role"]]))
        elif message["role"] == "assistant" and not message.get("function_call"):
            print(colored(f"assistant: {message['content']}\n", role_to_color[message["role"]]))
        elif message["role"] == "function":
            print(colored(f"function ({message['name']}): {message['content']}\n", role_to_color[message["role"]]))
```

## Weather API Example

Let's create some function specifications to interface with a hypothetical weather API:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "format": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The temperature unit to use. Infer this from the users location.",
                    },
                },
                "required": ["location", "format"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_n_day_weather_forecast",
            "description": "Get an N-day weather forecast",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "format": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The temperature unit to use. Infer this from the users location.",
                    },
                    "num_days": {
                        "type": "integer",
                        "description": "The number of days to forecast"
                    }
                },
                "required": ["location", "format", "num_days"]
            }
        }
    },
]
```

## Example Conversation Flow

```python
messages = []
messages.append({"role": "system", "content": "Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous."})
messages.append({"role": "user", "content": "What's the weather like today"})

chat_response = chat_completion_request(
    messages, tools=tools
)
assistant_message = chat_response.choices[0].message
messages.append(assistant_message)
```

When we prompt the model about the current weather, it will respond with clarifying questions. Once we provide the missing information, it will generate the appropriate function arguments for us.

You can also disable parallel function calling by setting `parallel_tool_calls: false`.

# Database Integration Examples

## Specifying a Function to Execute SQL Queries

First let's define some helpful utility functions to extract data from a SQLite database:

```python
import sqlite3
conn = sqlite3.connect("data/Chinook.db")
print("Opened database successfully")

def get_table_names(conn):
    """Return a list of table names."""
    table_names = []
    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    for table in tables.fetchall():
        table_names.append(table[0])
    return table_names

def get_column_names(conn, table_name):
    """Return a list of column names."""
    column_names = []
    columns = conn.execute(f"PRAGMA table_info('{table_name}');").fetchall()
    for col in columns:
        column_names.append(col[1])
    return column_names

def get_database_info(conn):
    """Return a list of dicts containing the table name and columns for each table in the database."""
    table_dicts = []
    for table_name in get_table_names(conn):
        columns_names = get_column_names(conn, table_name)
        table_dicts.append({"table_name": table_name, "column_names": columns_names})
    return table_dicts

database_schema_dict = get_database_info(conn)
database_schema_string = "\n".join(
    [
        f"Table: {table['table_name']}\nColumns: {', '.join(table['column_names'])}"
        for table in database_schema_dict
    ]
)
```

Now we can define our function specification for SQL queries:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "ask_database",
            "description": "Use this function to answer user questions about music. Input should be a fully formed SQL query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": f"""
                        SQL query extracting info to answer the user's question.
                        SQL should be written using this database schema:
                        {database_schema_string}
                        The query should be returned in plain text, not in JSON.
                        """
                    }
                },
                "required": ["query"],
            }
        }
    }
]

def ask_database(conn, query):
    """Function to query SQLite database with a provided SQL query."""
    try:
        results = str(conn.execute(query).fetchall())
    except Exception as e:
        results = f"query failed with error: {e}"
    return results
```

## Example Database Query Conversation

```python
messages = [{
    "role":"user", 
    "content": "What is the name of the album with the most tracks?"
}]

response = client.chat.completions.create(
    model='gpt-4o', 
    messages=messages, 
    tools=tools, 
    tool_choice="auto" 
)

# Append the message to messages list
response_message = response.choices[0].message 
messages.append(response_message)

# Check if the response from the model includes a tool call
tool_calls = response_message.tool_calls
if tool_calls:
    # Execute the function
    tool_call = tool_calls[0]
    tool_call_id = tool_call.id
    function_name = tool_call.function.name
    function_args = json.loads(tool_call.function.arguments)

    # Call the function
    if function_name == "ask_database":
        results = ask_database(conn, function_args["query"])
        
        # Append the function response to messages
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": function_name,
            "content": results
        })
        
        # Get a new response from the model where it can see the function response
        second_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )
        print(second_response.choices[0].message.content)
```

## Error Handling and Best Practices

1. Always validate function inputs
2. Use try/except blocks for function execution
3. Properly handle database connections and queries
4. Return clear error messages when functions fail
5. Keep track of conversation context and function call results
6. Use proper parameter types and descriptions in function definitions
7. Implement retries for API calls using exponential backoff
8. Monitor function execution times and set appropriate timeouts

These examples demonstrate how to implement function calling with both simple APIs and database integrations while maintaining proper error handling and conversation flow.

# How to Use Functions with a Knowledge Base

This notebook builds on the concepts in the argument generation notebook, by creating an agent with access to a knowledge base and two functions that it can call based on the user requirement.

## Overview

We'll create an agent that uses data from arXiv to answer questions about academic subjects. It has two functions at its disposal:

- `get_articles`: A function that gets arXiv articles on a subject and summarizes them for the user with links.
- `read_article_and_summarize`: This function takes one of the previously searched articles, reads it in its entirety and summarizes the core argument, evidence and conclusions.

This will get you comfortable with a multi-function workflow that can choose from multiple services, and where some of the data from the first function is persisted to be used by the second.

## Setup and Prerequisites

```python
import os
import arxiv
import ast
import concurrent
import json
import os
import pandas as pd
import tiktoken
from csv import writer
from IPython.display import display, Markdown, Latex
from openai import OpenAI
from PyPDF2 import PdfReader
from scipy import spatial
from tenacity import retry, wait_random_exponential, stop_after_attempt
from tqdm import tqdm
from termcolor import colored

GPT_MODEL = "gpt-4o-mini"
EMBEDDING_MODEL = "text-embedding-ada-002"
client = OpenAI()

# Set up directories
directory = './data/papers'
if not os.path.exists(directory):
    os.makedirs(directory)
    print(f"Directory '{directory}' created successfully.")
else:
    print(f"Directory '{directory}' already exists.")

# Set a directory to store downloaded papers
data_dir = os.path.join(os.curdir, "data", "papers")
paper_dir_filepath = "./data/arxiv_library.csv"

# Generate a blank dataframe where we can store downloaded files
df = pd.DataFrame(list())
df.to_csv(paper_dir_filepath)
```

## Search Utilities

First, let's define our key utility functions:

```python
@retry(wait=wait_random_exponential(min=1, max=40), stop=stop_after_attempt(3))
def embedding_request(text):
    response = client.embeddings.create(input=text, model=EMBEDDING_MODEL)
    return response

@retry(wait=wait_random_exponential(min=1, max=40), stop=stop_after_attempt(3))
def get_articles(query, library=paper_dir_filepath, top_k=5):
    """This function gets the top_k articles based on a user's query, sorted by relevance.
    It also downloads the files and stores them in arxiv_library.csv to be retrieved by the read_article_and_summarize function.
    """
    client = arxiv.Client()
    search = arxiv.Search(
        query = "quantum",
        max_results = 10,
        sort_by = arxiv.SortCriterion.SubmittedDate
    )
    
    result_list = []
    for result in client.results(search):
        result_dict = {}
        result_dict.update({"title": result.title})
        result_dict.update({"summary": result.summary})
        result_dict.update({"article_url": [x.href for x in result.links][0]})
        result_dict.update({"pdf_url": [x.href for x in result.links][1]})
        result_list.append(result_dict)
        
        # Store references in library file
        response = embedding_request(text=result.title)
        file_reference = [
            result.title,
            result.download_pdf(data_dir),
            response.data[0].embedding,
        ]
        
        # Write to file
        with open(library, "a") as f_object:
            writer_object = writer(f_object)
            writer_object.writerow(file_reference)
            f_object.close()
    
    return result_list

def strings_ranked_by_relatedness(
    query: str,
    df: pd.DataFrame,
    relatedness_fn=lambda x, y: 1 - spatial.distance.cosine(x, y),
    top_n: int = 100,
) -> list[str]:
    """Returns a list of strings and relatednesses, sorted from most related to least."""
    query_embedding_response = embedding_request(query)
    query_embedding = query_embedding_response.data[0].embedding
    strings_and_relatednesses = [
        (row["filepath"], relatedness_fn(query_embedding, row["embedding"]))
        for i, row in df.iterrows()
    ]
    strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
    strings, relatednesses = zip(*strings_and_relatednesses)
    return strings[:top_n]

def read_pdf(filepath):
    """Takes a filepath to a PDF and returns a string of the PDF's contents"""
    reader = PdfReader(filepath)
    pdf_text = ""
    page_number = 0
    for page in reader.pages:
        page_number += 1
        pdf_text += page.extract_text() + f"\nPage Number: {page_number}"
    return pdf_text
```

## Text Processing Utilities

```python
def create_chunks(text, n, tokenizer):
    """Returns successive n-sized chunks from provided text."""
    tokens = tokenizer.encode(text)
    i = 0
    while i < len(tokens):
        # Find the nearest end of sentence within a range of 0.5 * n and 1.5 * n tokens
        j = min(i + int(1.5 * n), len(tokens))
        while j > i + int(0.5 * n):
            # Decode the tokens and check for full stop or newline
            chunk = tokenizer.decode(tokens[i:j])
            if chunk.endswith(".") or chunk.endswith("\n"):
                break
            j -= 1
        # If no end of sentence found, use n tokens as the chunk size
        if j == i + int(0.5 * n):
            j = min(i + n, len(tokens))
        yield tokens[i:j]
        i = j

def extract_chunk(content, template_prompt):
    """This function applies a prompt to some input content. In this case it returns a summarized chunk of text"""
    prompt = template_prompt + content
    response = client.chat.completions.create(
        model=GPT_MODEL, messages=[{"role": "user", "content": prompt}], temperature=0
    )
    return response.choices[0].message.content

def summarize_text(query):
    """This function does the following:
    - Reads in the arxiv_library.csv file including the embeddings
    - Finds the closest file to the user's query
    - Scrapes the text out of the file and chunks it
    - Summarizes each chunk in parallel
    - Does one final summary and returns this to the user"""
    # A prompt to dictate how the recursive summarizations should approach the input paper
    summary_prompt = """Summarize this text from an academic paper. Extract any key points with reasoning.\n\nContent: """
    
    # If the library is empty (no searches have been performed yet), we perform one and download the results
    library_df = pd.read_csv(paper_dir_filepath).reset_index()
    if len(library_df) == 0:
        print("No papers searched yet, downloading first.")
        get_articles(query)
        print("Papers downloaded, continuing")
        library_df = pd.read_csv(paper_dir_filepath).reset_index()
        
    library_df["embedding"] = library_df["embedding"].apply(ast.literal_eval)
    strings = strings_ranked_by_relatedness(query, library_df, top_n=1)
    
    print("Chunking text from paper")
    pdf_text = read_pdf(strings[0])
    
    # Initialize tokenizer
    tokenizer = tiktoken.get_encoding("cl100k_base")
    results = ""
    
    # Chunk up the document into 1500 token chunks
    chunks = create_chunks(pdf_text, 1500, tokenizer)
    text_chunks = [tokenizer.decode(chunk) for chunk in chunks]
    
    print("Summarizing each chunk of text")
    # Parallel process the summaries
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(text_chunks)) as executor:
        futures = [
            executor.submit(extract_chunk, chunk, summary_prompt)
            for chunk in text_chunks
        ]
        with tqdm(total=len(text_chunks)) as pbar:
            for _ in concurrent.futures.as_completed(futures):
                pbar.update(1)
                
        for future in futures:
            data = future.result()
            results += data
            
    # Final summary
    print("Summarizing into overall summary")
    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {
                "role": "user",
                "content": f"""Write a summary collated from this collection of key points extracted from an academic paper.
                The summary should highlight the core argument, conclusions and evidence, and answer the user query: {query}
                The summary should be structured in bulleted lists following the headings Core Argument, Evidence and Conclusions.
                Key points:\n{results}\nSummary:\n""",
            }
        ],
        temperature=0,
    )
    return response
```

## Configure Agent

We'll create our agent in this step, including a Conversation class and function definitions:

```python
@retry(wait=wait_random_exponential(min=1, max=40), stop=stop_after_attempt(3))
def chat_completion_request(messages, functions=None, model=GPT_MODEL):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            functions=functions,
        )
        return response
    except Exception as e:
        print("Unable to generate ChatCompletion response")
        print(f"Exception: {e}")
        return e

class Conversation:
    def __init__(self):
        self.conversation_history = []
        
    def add_message(self, role, content):
        message = {"role": role, "content": content}
        self.conversation_history.append(message)
        
    def display_conversation(self, detailed=False):
        role_to_color = {
            "system": "red",
            "user": "green",
            "assistant": "blue",
            "function": "magenta",
        }
        
        for message in self.conversation_history:
            print(
                colored(
                    f"{message['role']}: {message['content']}\n\n",
                    role_to_color[message["role"]],
                )
            )

# Define our arXiv functions
arxiv_functions = [
    {
        "name": "get_articles",
        "description": """Use this function to get academic papers from arXiv to answer user questions.""",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": f"""
                    User query in JSON. Responses should be summarized and should include the article URL 
                    """,
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "read_article_and_summarize",
        "description": """Use this function to read whole papers and provide a summary for users.
        You should NEVER call this function before get_articles has been called in the conversation.""",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": f"""
                    Description of the article in plain text based on the user's query
                    """,
                }
            },
            "required": ["query"],
        },
    }
]
```

## Function Handling Implementation

```python
def chat_completion_with_function_execution(messages, functions=[None]):
    """This function makes a ChatCompletion API call with the option of adding functions"""
    response = chat_completion_request(messages, functions)
    full_message = response.choices[0]
    if full_message.finish_reason == "function_call":
        print(f"Function generation requested, calling function")
        return call_arxiv_function(messages, full_message)
    else:
        print(f"Function not required, responding to user")
        return response

def call_arxiv_function(messages, full_message):
    """Function calling function which executes function calls when the model believes it is necessary.
    Currently extended by adding clauses to this if statement."""
    if full_message.message.function_call.name == "get_articles":
        try:
            parsed_output = json.loads(
                full_message.message.function_call.arguments
            )
            print("Getting search results")
            results = get_articles(parsed_output["query"])
        except Exception as e:
            print(parsed_output)
            print(f"Function execution failed")
            print(f"Error message: {e}")
            
        messages.append(
            {
                "role": "function",
                "name": full_message.message.function_call.name,
                "content": str(results),
            }
        )
        
        try:
            print("Got search results, summarizing content")
            response = chat_completion_request(messages)
            return response
        except Exception as e:
            print(type(e))
            raise Exception("Function chat request failed")
            
    elif (
        full_message.message.function_call.name == "read_article_and_summarize"
    ):
        parsed_output = json.loads(
            full_message.message.function_call.arguments
        )
        print("Finding and reading paper")
        summary = summarize_text(parsed_output["query"])
        return summary
    else:
        raise Exception("Function does not exist and cannot be called")
```

## Example Usage

```python
# Start with a system message
paper_system_message = """You are arXivGPT, a helpful assistant pulls academic papers to answer user questions.
You summarize the papers clearly so the customer can decide which to read to answer their question.
You always provide the article_url and title so the user can understand the name of the paper and click through to read more.
Begin!"""

paper_conversation = Conversation()
paper_conversation.add_message("system", paper_system_message)

# Add a user message
paper_conversation.add_message("user", "Hi, how does PPO reinforcement learning work?")

chat_response = chat_completion_with_function_execution(
    paper_conversation.conversation_history, functions=arxiv_functions
)

assistant_message = chat_response.choices[0].message.content
paper_conversation.add_message("assistant", assistant_message)
display(Markdown(assistant_message))

# Add another request to read a specific paper
paper_conversation.add_message(
    "user",
    "Can you read the PPO sequence generation paper for me and give me a summary",
)

updated_response = chat_completion_with_function_execution(
    paper_conversation.conversation_history, functions=arxiv_functions
)
display(Markdown(updated_response.choices[0].message.content))
```

This implementation demonstrates:
1. Setting up an arXiv paper search and retrieval system
2. Processing and chunking PDF content
3. Parallel processing of text summarization
4. Managing conversation state
5. Handling multiple function calls in sequence
6. Error handling and retries
7. Structured output formatting