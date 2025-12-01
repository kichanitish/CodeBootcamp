import React, { useState, useEffect } from 'react';
import { Search, Heart, Clock, MessageSquare, BookOpen, LogOut, LogIn, User, X } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ScholarlyInsight() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email_confirmed_at);
      // Only set user if email is confirmed
      if (session?.user?.email_confirmed_at) {
        setUser(session.user);
        console.log('User logged in with confirmed email');
      } else {
        setUser(null);
        console.log('User not logged in or email not confirmed');
      }
      setAuthLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadHistory();
    }
  }, [user]);

  useEffect(() => {
    if (selectedArticle && user) {
      loadComments(selectedArticle.id);
      addToHistory(selectedArticle);
    }
  }, [selectedArticle]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Check user result:', user?.email_confirmed_at, error);
      // Only set user if they've confirmed their email
      if (user && user.email_confirmed_at) {
        setUser(user);
        console.log('User verified on initial load');
      } else if (user) {
        console.log('User exists but email not confirmed:', user.email);
        setUser(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error checking user:', err);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const checkUsernameAvailable = async (username) => {
    const { data, error } = await supabase
      .from('users')
      .select('username', { count: 'exact' })
      .eq('username', username);
    
    // If no error and data array is empty, username is available
    if (error) {
      console.error('Error checking username:', error);
      return false;
    }
    
    return data.length === 0;
  };

  const formatTimeEastern = (dateString) => {
    // Parse the ISO string properly as UTC
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    
    // Get the time in Eastern timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return formatter.format(date) + ' ET';
  };

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    if (authMode === 'signup' && !username) {
      alert('Please enter a username');
      return;
    }

    if (authMode === 'signup') {
      // Check if username is available
      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable) {
        setUsernameError('Username already taken. Please choose another.');
        return;
      }
      setUsernameError('');
    }

    let authData;
    if (authMode === 'login') {
      // Try with email first
      let result = await supabase.auth.signInWithPassword({ email, password });
      
      // If email login fails, try with username
      if (result.error) {
        console.log('Email login failed, trying with username...');
        
        // Query the users table to find the email associated with this username
        const { data: userData, error: queryError } = await supabase
          .from('users')
          .select('email')
          .eq('username', email);
        
        console.log('Username query result:', userData, queryError);
        
        // Get the first matching user if found
        if (userData && userData.length > 0 && userData[0]?.email) {
          console.log('Found user with email:', userData[0].email);
          result = await supabase.auth.signInWithPassword({ email: userData[0].email, password });
        } else {
          console.log('No user found with username:', email);
        }
      }
      
      authData = result;
    } else {
      // Signup - set username in metadata BEFORE signup so the trigger can access it
      authData = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username: username
          }
        }
      });
    }
    
    const { data, error } = authData;
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        alert('Invalid email/username or password');
      } else if (error.message.includes('Email not confirmed')) {
        alert('Please confirm your email before logging in. Check your inbox for a confirmation link.');
      } else {
        alert(`Error: ${error.message}`);
      }
      console.error('Auth error:', error);
    } else {
      if (authMode === 'signup' && data?.user) {
        console.log('User successfully signed up:', data.user.id);
        console.log('User record will be created automatically by database trigger');
        alert('Account created! Please check your email to verify your account. After confirmation, you can log in.');
      }
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthMode('login');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('search');
  };

  const searchArxiv = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }
    
    setLoading(true);
    try {
      const categoryMap = {
        all: 'all',
        title: 'ti',
        author: 'au',
        abstract: 'abs',
        category: 'cat'
      };
      
      const searchParam = searchCategory === 'all' 
        ? `all:${encodeURIComponent(searchQuery)}`
        : `${categoryMap[searchCategory]}:${encodeURIComponent(searchQuery)}`;
      
      const url = `/arxiv-api/query?search_query=${searchParam}&start=0&max_results=20`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Response text length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));
      
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      // Check for parsing errors
      const parserError = xml.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        throw new Error('Failed to parse XML response');
      }
      
      const entries = xml.querySelectorAll('entry');
      console.log('Number of entries found:', entries.length);
      
      if (entries.length === 0) {
        setArticles([]);
        alert('No articles found. Try a different search term.');
        setLoading(false);
        return;
      }
      
      const parsedArticles = Array.from(entries).map((entry, index) => {
        console.log(`Parsing entry ${index + 1}`);
        
        // Extract all categories from arxiv:primary_category and category elements
        const categoryElements = entry.querySelectorAll('arxiv\\:primary_category, category');
        const categories = Array.from(categoryElements)
          .map(el => el.getAttribute('term'))
          .filter(Boolean);
        
        const article = {
          id: entry.querySelector('id')?.textContent || '',
          title: entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || '',
          summary: entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || '',
          authors: Array.from(entry.querySelectorAll('author name')).map(a => a.textContent),
          published: entry.querySelector('published')?.textContent || '',
          link: entry.querySelector('id')?.textContent || '',
          pdfLink: entry.querySelector('link[title="pdf"]')?.getAttribute('href') || '',
          categories: categories.length > 0 ? categories : ['Uncategorized']
        };
        
        console.log('Parsed article:', article.title, 'Categories:', categories);
        return article;
      });
      
      console.log('Total articles parsed:', parsedArticles.length);
      setArticles(parsedArticles);
      
    } catch (error) {
      console.error('Detailed error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      alert(`Error searching articles: ${error.message}\n\nCheck console for details.`);
    }
    setLoading(false);
  };

  const loadFavorites = async () => {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setFavorites(data || []);
    }
  };

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false });
    
    if (!error) {
      setHistoryList(data || []);
    }
  };

  const loadComments = async (articleId) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading comments:', error);
    } else {
      console.log('Comments loaded:', data);
      setComments(data || []);
    }
  };

  const toggleFavorite = async (article) => {
    if (!user) {
      alert('Please login to save favorites');
      return;
    }
    
    const existing = favorites.find(f => f.article_id === article.id);
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        article_id: article.id,
        article_data: article
      });
    }
    loadFavorites();
  };

  const addToHistory = async (article) => {
    if (!user) return;
    
    // Check if article already exists in history
    const existing = historyList.find(h => h.article_id === article.id);
    
    if (existing) {
      // Update the viewed_at timestamp for existing entry
      await supabase.from('history').update({ viewed_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      // Create new history entry
      await supabase.from('history').insert({
        user_id: user.id,
        article_id: article.id,
        article_data: article
      });
    }
    
    loadHistory();
  };

  const addComment = async () => {
    if (!user || !newComment.trim() || !selectedArticle) return;
    
    // Get username from users table
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('user_id', user.id)
      .single();
    
    const commentUsername = userData?.username || user.user_metadata?.username;
    
    console.log('Adding comment with username:', commentUsername);
    
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      article_id: selectedArticle.id,
      user_email: user.email,
      username: commentUsername,
      content: newComment
    });
    
    if (error) {
      console.error('Error adding comment:', error);
      alert(`Error posting comment: ${error.message}`);
    } else {
      setNewComment('');
      loadComments(selectedArticle.id);
    }
  };

  const deleteComment = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.error('Delete error:', error);
      alert(`Error deleting comment: ${error.message}`);
    } else {
      loadComments(selectedArticle.id);
    }
  };

  const isFavorited = (articleId) => favorites.some(f => f.article_id === articleId);

  const removeFavorite = async (favoriteId) => {
    await supabase.from('favorites').delete().eq('id', favoriteId);
    loadFavorites();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Scholarly Insight</h1>
          </div>
          
          {authLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
          <div className="flex mb-6 border-b">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 ${authMode === 'login' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 ${authMode === 'signup' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>
          
          <div className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Choose a public username"
                />
                {usernameError && <p className="text-red-600 text-sm mt-1">{usernameError}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAuth}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-indigo-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Scholarly Insight</h1>
          </div>
          
          <nav className="flex items-center space-x-4">
            <button
              onClick={() => setView('search')}
              className={`flex items-center px-4 py-2 rounded-lg ${view === 'search' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
            <button
              onClick={() => setView('favorites')}
              className={`flex items-center px-4 py-2 rounded-lg ${view === 'favorites' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </button>
            <button
              onClick={() => setView('history')}
              className={`flex items-center px-4 py-2 rounded-lg ${view === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Clock className="w-4 h-4 mr-2" />
              History
            </button>
            <div className="flex items-center text-sm text-gray-600 ml-4">
              <User className="w-4 h-4 mr-1" />
              {user.user_metadata?.username || user.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search View */}
        {view === 'search' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchArxiv()}
                    placeholder="Search research papers..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Fields</option>
                  <option value="title">Title</option>
                  <option value="author">Author</option>
                  <option value="abstract">Abstract</option>
                  <option value="category">Category</option>
                </select>
                <button
                  onClick={searchArxiv}
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {articles.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{article.title}</h3>
                      <div className="mb-2 flex flex-wrap gap-1">
                        {article.categories?.map((category, idx) => (
                          <span key={idx} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded">
                            {category}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {article.authors.slice(0, 3).join(', ')}
                        {article.authors.length > 3 && ' et al.'}
                      </p>
                      <p className="text-gray-700 mb-3 line-clamp-3">{article.summary}</p>
                      <p className="text-xs text-gray-500">Published: {new Date(article.published).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => toggleFavorite(article)}
                        className={`p-2 rounded-lg ${isFavorited(article.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <Heart className="w-5 h-5" fill={isFavorited(article.id) ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View on arXiv
                    </a>
                    {article.pdfLink && (
                      <a
                        href={article.pdfLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites View */}
        {view === 'favorites' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">My Favorites</h2>
            {favorites.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No favorites yet. Start searching and save articles!
              </div>
            ) : (
              favorites.map((fav) => {
                const article = fav.article_data;
                return (
                  <div key={fav.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-800 flex-1">{article.title}</h3>
                      <button
                        onClick={() => removeFavorite(fav.id)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove from favorites"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{article.authors.slice(0, 3).join(', ')}</p>
                    <p className="text-gray-700 mb-3 line-clamp-2">{article.summary}</p>
                    <div className="flex gap-2">
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
                        View on arXiv
                      </a>
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        View Comments
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reading History</h2>
            {historyList.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No reading history yet.
              </div>
            ) : (
              historyList.map((hist) => {
                const article = hist.article_data;
                return (
                  <div key={hist.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{article.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{article.authors.slice(0, 3).join(', ')}</p>
                        <p className="text-xs text-gray-500">Viewed: {formatTimeEastern(hist.viewed_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <h2 className="text-2xl font-bold text-gray-800 pr-8">{selectedArticle.title}</h2>
              <button onClick={() => setSelectedArticle(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                <strong>Authors:</strong> {selectedArticle.authors.join(', ')}
              </p>
              <p className="text-gray-700 mb-4">{selectedArticle.summary}</p>
              <div className="mb-6 flex flex-wrap gap-1">
                {selectedArticle.categories?.map((category, idx) => (
                  <span key={idx} className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded">
                    {category}
                  </span>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Comments ({comments.length})
                </h3>
                
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add your comment..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                  />
                  <button
                    onClick={addComment}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Post Comment
                  </button>
                </div>
                
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-600 mr-2" />
                          <span className="text-sm font-semibold text-gray-700">{comment.username}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTimeEastern(comment.created_at)}
                          </span>
                        </div>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete comment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
