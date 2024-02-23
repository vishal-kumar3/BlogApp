"use client"
import React, { useEffect, useState } from 'react';
import styles from "./Create/styles.module.css";
import commentStyles from "./styles.module.css"
import { deleteBlog, getBlogById, viewBlogById } from '@/app/server/blogs';
import { userById } from '@/app/server/signup';
import WriteComment from './WriteComment';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const ShowBlog = ({ id }) => {
    const [blog, setBlog] = useState({});
    const [owner, setOwner] = useState({});
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([])

    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            try {
                const blogData = await getBlogById(id);
                await viewBlogById(id);
                setBlog(blogData);

                const writer = await userById(blogData.owner);
                setOwner(writer);

                // Set initial comments
                setComments(blogData.comment);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.profileCard}>
                <div className={styles.profile}>
                    <img src={owner.avatarImage} alt="avatar" />
                    <Link href={`/user/${owner._id}`}>{owner.fullName}</Link>
                </div>
                <div>
                    <button onClick={async(e) => {
                        // const response = await deleteBlog(blog._id)
                        router.replace('/')
                    }}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
            </div>
            <div className={styles.blogPart}>
                <h1>{blog.title}</h1>
                <p>{blog.description}</p>
                {/* Render the first image */}
                {blog.images.length > 0 && <img src={blog.images[0]} alt="holla" />}
            </div>
            {/* comment sectoin */}

            <hr className={commentStyles.hr}/>

            <div className={commentStyles.comment}>
                <WriteComment id={id} blogComments={comments} commentIdReply={null} />

            </div>
        </div>
    );
};

export default ShowBlog;
