  import { createContext, useContext, useEffect, useState } from "react";
  import axios from "axios";
  import { useAuth, useUser } from "@clerk/clerk-react";
  import { useLocation, useNavigate } from "react-router-dom";
  import toast from "react-hot-toast";

  axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

  const AppContext = createContext()

  const AppProvider = ({ children})=> {

    const [isAdmin, setIsAdmin] = useState(false)
    const [shows, setShows] = useState([])
    const [favoriteMovies, setFavoriteMovies] = useState([])

    const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

    const {user, isLoaded} = useUser()
    const {getToken} = useAuth()
    const location = useLocation()

    const navigate = useNavigate()

    // Chặn không chạy khi Clerk chưa load
    useEffect(() => {
      if (!isLoaded) return;
      if (user) {
        fetchIsAdmin();
        fetchFavoriteMovies();
      }
    }, [isLoaded, user]);

    

    const fetchIsAdmin = async() =>{
      try {
          const {data} = await axios.get('api/admin/is-admin', {headers:
          {Authorization: `Bearer ${await getToken()}`}})
          setIsAdmin(data.isAdmin)

          if (!data.isAdmin && location.pathname.startsWith('/admin')){
            navigate('/')
            toast.dismiss()
            toast.error('You are not allowed to access admin dashboard', { id: 'admin-error' })
          }
      } catch (error) {
          console.error(error)
      }
    }

    const fetchShows = async ()=>{
      try {
          const { data } = await axios.get('/api/show/all')
          if(data.success){
            setShows(data.shows)
          }else{
            toast.error(data.message)
          }
      } catch (error) {
          console.error(error)
      }
    }

    const fetchFavoriteMovies = async ()=> {
      try {
        const { data } = await axios.get('/api/user/favorites', {headers: {Authorization: `Bearer ${await getToken()}`}})
        
        if(data.success) {
          setFavoriteMovies(data.movies)
        }else{
          console.warn(data.message)
        }
      } catch (error) {
        console.error(error) 
      }
    }

    useEffect(() => {
      fetchShows()
    }, [])


    const value = {
      axios,
      fetchIsAdmin,
      user, getToken, navigate, isAdmin, shows,
      favoriteMovies, fetchFavoriteMovies, image_base_url,
      setFavoriteMovies,
    }
    return (
      <AppContext.Provider value={value}>
        { children }
      </AppContext.Provider>
    )

  }
  const useAppContext = () => useContext(AppContext);

  export default AppProvider;
  export { useAppContext, AppContext };