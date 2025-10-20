import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

def search_arxiv(query, max_results=5):
    """
    Searches the arXiv API for articles and prints key information.

    :param query: The search query string (e.g., 'all:deep learning').
    :param max_results: The maximum number of results to retrieve.
    """
    # Base URL for the arXiv API query
    base_url = 'http://export.arxiv.org/api/query?'

    # Search parameters
    params = {
        'search_query': query,
        'start': 0,
        'max_results': max_results,
        'sortBy': 'relevance',
        'sortOrder': 'descending'
    }

    # Encode the parameters and construct the full URL
    url = base_url + urllib.parse.urlencode(params)

    print(f"Retrieving search results for: '{query}'")
    
    try:
        # Perform the API request
        with urllib.request.urlopen(url) as response:
            xml_data = response.read()

        # Parse the XML response
        root = ET.fromstring(xml_data)

        # ArXiv uses Atom XML format, so we need the namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}

        # Find all 'entry' elements (articles)
        entries = root.findall('atom:entry', ns)

        if not entries:
            print("\nNo articles found for this query.")
            return

        print(f"\nFound {len(entries)} articles:\n")

        # Iterate over each article entry and extract details
        for i, entry in enumerate(entries, 1):
            title = entry.find('atom:title', ns).text.strip()
            # ArXiv ID is in the link element
            link = entry.find("atom:link[@rel='alternate']", ns).attrib['href']
            
            # Authors are in separate tags
            authors = [
                author.find('atom:name', ns).text
                for author in entry.findall('atom:author', ns)
            ]
            
            published = entry.find('atom:published', ns).text[:10] # Get only the date part

            print(f"--- Article {i} ---")
            print(f"Title: {title}")
            print(f"Authors: {', '.join(authors)}")
            print(f"Published: {published}")
            print(f"Link: {link}\n")

    except urllib.error.URLError as e:
        print(f"\nError connecting to the API: {e.reason}")
    except ET.ParseError:
        print("\nError parsing the XML response.")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

# --- Example Usage ---
if __name__ == "__main__":
    search_term = "all:transformer AND cat:cs.CL"
    number_of_results = 5
    
    # Run the search function
    search_arxiv(search_term, number_of_results)