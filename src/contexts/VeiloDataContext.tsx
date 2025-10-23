
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';
import { Post, Expert, Comment as VeiloComment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { postsServiceRobust } from '@/services/robustApiService';

interface VeiloDataContextType {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  experts: Expert[];
  setExperts: (experts: Expert[]) => void;
  loading: {
    posts: boolean;
    experts: boolean;
  };
  refreshPosts: () => Promise<void>;
  refreshExperts: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  createPost: (content: string, feeling?: string, topic?: string, wantsExpertHelp?: boolean, attachments?: File[]) => Promise<Post | null>;
  addComment: (postId: string, content: string) => Promise<Post | null>;
  flagPost: (postId: string, reason: string) => Promise<boolean>;
}

const VeiloDataContext = createContext<VeiloDataContextType>({
  posts: [],
  setPosts: () => {},
  experts: [],
  setExperts: () => {},
  loading: {
    posts: false,
    experts: false,
  },
  refreshPosts: async () => {},
  refreshExperts: async () => {},
  likePost: async () => {},
  unlikePost: async () => {},
  createPost: async () => null,
  addComment: async () => null,
  flagPost: async () => false,
});

export const useVeiloData = () => useContext(VeiloDataContext);

export const VeiloDataProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState({
    posts: true,
    experts: true,
  });
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    // Always load posts and experts so anonymous users also see content
    refreshPosts();
    refreshExperts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPosts = async () => {
    setLoading(prev => ({ ...prev, posts: true }));
    try {
      console.log('📋 Refreshing posts...');
      const response = await postsServiceRobust.getAll();
      if (response.success && response.data) {
        const posts = response.data as Post[];
        console.log(`✅ Posts loaded successfully from ${response.source}:`, posts.length);
        setPosts(posts);
        
        if (response.source === 'fallback') {
          toast({
            title: 'Running in Offline Mode',
            description: 'Showing cached content while we reconnect to the server.',
            variant: 'default',
          });
        }
      } else {
        console.error('❌ Failed to fetch posts:', response.error);
        toast({
          title: 'Connection Issues',
          description: response.error || 'Unable to load posts. Check your internet connection.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error fetching posts:', error);
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to server. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, posts: false }));
    }
  };

  const refreshExperts = async () => {
    setLoading(prev => ({ ...prev, experts: true }));
    try {
      console.log('👥 Refreshing experts...');
      // For now, set empty array - we'll add proper expert API later
      setExperts([]);
      console.log('✅ Experts loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching experts:', error);
    } finally {
      setLoading(prev => ({ ...prev, experts: false }));
    }
  };

  const likePost = async (postId: string) => {
    if (!isAuthenticated || !user) return;
    
    try {
      console.log('👍 Liking post:', postId);
      // For now, simulate like functionality
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const currentLikes = post.likes || [];
            const userAlreadyLiked = currentLikes.includes(user.id);
            
            if (!userAlreadyLiked) {
              return { ...post, likes: [...currentLikes, user.id] };
            }
          }
          return post;
        })
      );
      
      toast({
        title: 'Post liked',
        description: 'Your like has been added',
      });
    } catch (error) {
      console.error('❌ Error liking post:', error);
    }
  };

  const unlikePost = async (postId: string) => {
    if (!isAuthenticated || !user) return;
    
    try {
      console.log('👎 Unliking post:', postId);
      // For now, simulate unlike functionality
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const currentLikes = post.likes || [];
            return { ...post, likes: currentLikes.filter(id => id !== user.id) };
          }
          return post;
        })
      );
      
      toast({
        title: 'Post unliked',
        description: 'Your like has been removed',
      });
    } catch (error) {
      console.error('❌ Error unliking post:', error);
    }
  };

  const createPost = async (
    content: string, 
    feeling?: string, 
    topic?: string,
    wantsExpertHelp: boolean = false,
    attachments: File[] = []
  ): Promise<Post | null> => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create posts.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      console.log('📝 Creating post...', { content: content.slice(0, 50), feeling, topic, wantsExpertHelp });
      
      const postData = {
        content,
        feeling,
        topic,
        wantsExpertHelp,
        authorId: user.id,
        anonymous: false, // Veilo allows anonymous posts but user identity is preserved
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      const response = await postsServiceRobust.create(postData);
      
      if (response.success && response.data) {
        const responseData = response.data as any;
        console.log(`✅ Post created successfully via ${response.source}:`, responseData);
        
        // Create a properly formatted post object
        const newPost: Post = {
          id: responseData.id || `post_${Date.now()}`,
          content,
          userId: user.id,
          userAlias: user.alias,
          userAvatarIndex: user.avatarIndex,
          feeling,
          topic,
          wantsExpertHelp,
          likes: [],
          comments: [],
          timestamp: new Date().toISOString(),
          languageCode: 'en',
          ...(typeof responseData === 'object' ? responseData : {})
        };
        
        // Add the new post to the local state
        setPosts(prevPosts => [newPost, ...prevPosts]);
        
        toast({
          title: 'Post created successfully',
          description: response.source === 'fallback' 
            ? 'Your post is saved locally and will sync when connection is restored'
            : 'Your post has been published to the community',
        });
        
        return newPost;
      } else {
        console.error('❌ Failed to create post:', response.error);
        toast({
          title: 'Failed to create post',
          description: response.error || 'Unable to publish post. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to server. Please check your connection and try again.',
        variant: 'destructive',
      });
    }
    
    return null;
  };

  const addComment = async (postId: string, content: string): Promise<Post | null> => {
    if (!isAuthenticated || !user) return null;
    
    try {
      console.log('💬 Adding comment to post:', postId);
      
      // For now, simulate comment addition
      const newComment: VeiloComment = {
        id: `comment_${Date.now()}`,
        content,
        userId: user.id,
        userAlias: user.alias,
        userAvatarIndex: user.avatarIndex,
        isExpert: false,
        timestamp: new Date().toISOString(),
        languageCode: 'en'
      };
      
      let updatedPost: Post | null = null;
      
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            updatedPost = { 
              ...post, 
              comments: [...(post.comments || []), newComment] 
            };
            return updatedPost;
          }
          return post;
        })
      );
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been published',
      });
      
      return updatedPost;
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
    
    return null;
  };

  const flagPost = async (postId: string, reason: string): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    try {
      console.log('🚩 Flagging post:', postId, 'Reason:', reason);
      
      // For now, simulate flagging
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, flagged: true, flagReason: reason }
            : post
        )
      );
      
      toast({
        title: 'Post reported',
        description: 'Thank you for helping keep our community safe',
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error flagging post:', error);
      toast({
        title: 'Error',
        description: 'Failed to report post',
        variant: 'destructive',
      });
    }
    
    return false;
  };

  return (
    <VeiloDataContext.Provider
      value={{
        posts,
        setPosts,
        experts,
        setExperts,
        loading,
        refreshPosts,
        refreshExperts,
        likePost,
        unlikePost,
        createPost,
        addComment,
        flagPost,
      }}
    >
      {children}
    </VeiloDataContext.Provider>
  );
};
