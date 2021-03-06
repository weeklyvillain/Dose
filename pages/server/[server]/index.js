import Layout from '../../../components/layout'
import Head from 'next/head'
import fetch from 'node-fetch'
import cookie from 'js-cookie';
import Router from 'next/router';
import { useEffect, useState } from 'react';
import { Carousel, Container, Row, Col } from 'react-bootstrap';


import Styles from '../../../styles/server.module.css';
import backdrop from '../../../components/movieBackdrop.module.css';


import MovieBackdrop from '../../../components/movieBackdrop';

const fetcher = url =>
  fetch(url)
    .then(r => {
      return r.json().then(result => {
          return result;
      });
    }
  );

export default (props) => {
    // props.server is from the SSR under this function
    let server = props.server;
    const [latestMovies, setLatesMovies] = useState(null);
    const [movies, setMovies] = useState([]);
    const [ongoingMovies, setOngoingMovies] = useState([]);




    // Check if user have access to this server
    const validateAccess = async (cb) => {
        return await fetch(`http://${server.server_ip}:4000/api/auth/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: cookie.get('token')
            }),
        })
        .then((r) => r.json())
        .then((data) => {
            if (data.status === 'success') {
                cookie.set('serverToken', data.token, {expires: 2});
                cb();
            } else {
                Router.push('/');

            }
        });
    }

    /**
     * Makes a query to the current active server for a list of movies
     * 
     * @param {string} genre 
     * @param {string} orderby 
     * @param {int} limit 
     */
    const getMovieList = async (genre=null, orderby=null, limit=20, ongoing=false) => {
        return new Promise((resolve, reject) => {
            let url;
            if (ongoing) {
                url = `http://${server.server_ip}:4000/api/movies/list/ongoing?${orderby !== null ? 'orderby='+orderby+'&' : ''}limit=${limit}&token=${cookie.get('serverToken')}`
            } else {
                url = `http://${server.server_ip}:4000/api/movies/list${genre !== null ? '/genre/'+genre : ''}?${orderby !== null ? 'orderby='+orderby+'&' : ''}limit=${limit}&token=${cookie.get('serverToken')}`
            }
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    limit: 20
                })
            })
            .then((r) => r.json())
            .then((response) => {
                // Mark the movies active image
                response.result.forEach(movie => {
                    for (let image of movie.images) {
                        if (image.active) {
                            if (image.type === 'BACKDROP') {
                                if (image.path === 'no_image') {
                                    movie.backdrop = null;
                                } else {
                                    movie.backdrop = image.path;
                                }
                            } else {
                                if (image.path === 'no_image') {
                                    movie.backdrop = null;
                                } else {
                                    movie.poster = image.path;
                                }
                            }

                            if (movie.backdrop != null && movie.poster != null) {
                                break;
                            }
                        }
                    }
                });
                resolve(response.result);
            });
        });
    }

    useEffect(() => {
        validateAccess(() => {
            // Get all the newest released movies (The slieshow)
            getMovieList(null, 'release_date', 5).then(movies => {
                movies.reverse();
                let movieElements = [];
                for (let movie of movies) {
                    let img = movie.backdrop !== null ? `https://image.tmdb.org/t/p/original/${movie.backdrop}` : 'https://via.placeholder.com/2000x1000' 
                    movieElements.push(
                        <Carousel.Item>
                            <img 
                                className="d-block w-100"
                                src={img}
                                alt={movie.title}
                                style={{objectFit: 'cover', height: '80vh', minHeight: '500px'}}
                                onClick={() => {selectMovie(movie.id)}}
                            />
                            <Carousel.Caption>
                                <h3>{movie.title}</h3>
                                <p>{movie.overview}</p>
                            </Carousel.Caption>
                        </Carousel.Item>
                    );
                }
                setLatesMovies(movieElements);
            });

            // Get ongoing movies
            getMovieList(null, 'release_date', 20, true).then(movies => {
                movies.reverse();
                console.log(movies);
                let movieElements = [];
                for (let movie of movies) {
                    let img = movie.backdrop !== null ? `https://image.tmdb.org/t/p/w500/${movie.backdrop}` : 'https://via.placeholder.com/2000x1000' 
                    movieElements.push(
                        <MovieBackdrop time={movie.watchtime} runtime={movie.runtime} title={movie.title} overview={movie.overview} runtime={movie.runtime} backdrop={img} onClick={(id) => selectMovie(movie.id)}></MovieBackdrop>
                    );
                }
                setOngoingMovies(movieElements);
            });

            




            // Get all genres from the server
            fetch(`http://${server.server_ip}:4000/api/genre/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then((r) => r.json())
            .then(async (result) => {
                let genres = result.genres;
                let genreList = [];
                for (let genre of genres) {
                    // Get the movies for that genre
                    const movieList = await getMovieList(genre.name, 'added_date', 20);
                    movieList.reverse();
                    let movieElements = [];
                    for (let movie of movieList) {
                        let img = movie.backdrop !== null ? `https://image.tmdb.org/t/p/w500/${movie.backdrop}` : 'https://via.placeholder.com/2000x1000' 
                        movieElements.push(
                            <MovieBackdrop title={movie.title} overview={movie.overview} runtime={movie.runtime} backdrop={img} onClick={(id) => selectMovie(movie.id)}></MovieBackdrop>
                        );
                    }
                    genreList.push({
                        name: genre.name,
                        movieElements: movieElements
                    });
                }
                console.log(genreList);
                setMovies(genreList);
            });
        });
    }, []);

    const selectMovie = (id) => {
        Router.push(`/server/${server.server_id}/video/${id}`);
    }


    const scrollLeft = (id) => {
        document.getElementById(id).scrollLeft -= (window.innerWidth)*0.8;
        window.scrollTo(window.scrollX, window.scrollY - 1);
        window.scrollTo(window.scrollX, window.scrollY + 1);
    }
    const scrollRight = (id) => {
        document.getElementById(id).scrollLeft += (window.innerWidth)*0.8;
        window.scrollTo(window.scrollX, window.scrollY - 1);
        window.scrollTo(window.scrollX, window.scrollY + 1);
    }

    const showMovies = () => {
        console.log("RERENDER")
        console.log(movies);
        let render = []
        movies.map((genre, index) => {
            if (genre.movieElements.length != 0) {
                render.push(
                    <>
                        <h2 style={{textTransform: 'capitalize'}}>{genre.name}</h2>    
                    <div className={Styles.movieRow}>
                        <div id={genre.name + "Movies"} className={Styles.scrollable}>
                            {genre.movieElements}
                        </div>
                        {genre.movieElements.length >= 5 &&
                            <>
                                <div className={Styles.scrollButton} onClick={() => scrollLeft(genre.name + 'Movies')}>
                                    <img src="/images/left.svg" width="70" />
                                </div>
                                <div className={Styles.scrollButton} style={{right: '0'}} onClick={() => scrollRight(genre.name + 'Movies')}>
                                    <img src="/images/right.svg" width="70" />
                                </div>

                            </>
                        }
                        
                    </div>
                    <hr className={Styles.divider}></hr>
                    </>   
                );
            }
        })
        return render;
    }

    // LAYOUT //
    return (
        <Layout>
            <Head>
            </Head>
            <Carousel interval={10000}>
                {latestMovies}
            </Carousel>
            <br></br>
            <div style={{color: 'white'}}>
                <Container fluid>
                    {ongoingMovies.length > 0 &&
                        <>
                            <h2 style={{textTransform: 'capitalize'}}>Ongoing</h2>    
                            <div className={Styles.movieRow}>
                                <div id="ongoingMovies" className={Styles.scrollable}>
                                    {ongoingMovies}
                                </div>
                                {ongoingMovies.length >= 5 &&
                                    <>
                                        <div className={Styles.scrollButton} onClick={() => scrollLeft('ongoingMovies')}>
                                            <img src="/images/left.svg" width="70" />
                                        </div>
                                        <div className={Styles.scrollButton} style={{right: '0'}} onClick={() => scrollRight('ongoingMovies')}>
                                            <img src="/images/right.svg" width="70" />
                                        </div>
                                    </>
                                }
                            </div> 
                        <hr className={Styles.divider}></hr>
                        </> 
                    }
                    {showMovies()}
                </Container>
            </div>
        </Layout>
    )
}








// Get the information about the server and send it to the front end before render (this is server-side)
export async function getServerSideProps(context) {
    let serverId = context.params.server;
    return await fetch('http://88.129.86.234:3000/api/servers/getServer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: serverId
        }),
    })
    .then((r) => r.json())
    .then((data) => {
        return {
            props: {
                server: data.server
            }
          }
    });
  }