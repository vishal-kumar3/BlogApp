"use client";
import React, { useState } from "react";
import Link from "next/link";
import styles from "./styles.module.css";

import { useSelector } from "react-redux";
import Image from "next/image";
import Logout from "../Logout";
import Spinner from "../Spinner";

const Header = () => {
  const user = useSelector((state) => state.user.currentUser);
  const loading = useSelector((state) => state.user.loading);

  const [dropDown, setDropDown] = useState(false);

  return (
    <>
      <div className="sticky top-0 flex items-center justify-between px-5 py-2 text-sm md:px-12">
        <div>
          <Link href={"/"}>Vishal's Blog</Link>
        </div>
        {/* <div
          style={{ zIndex: 500 }}
          className="absolute top-[100%] left-0 w-[100%] flex flex-col gap-2 items-center justify-center backdrop-blur-sm"
        >
          <input className="rounded-full w-[75%] px-5 py-2" type="text" placeholder="Search..." />
          <Link href="/">Home</Link>
          <Link href="/About">About</Link>
          <Link href="/Project">Projects</Link>
        </div> */}
        <div>
          {/* <div>Dark/Light</div> */}
          {user ? (
            <>
              {loading && <Spinner width={50} height={50} />}
              {!loading && (
                <Image
                  onClick={(e) => {
                    setDropDown(!dropDown);
                  }}
                  className={styles.profileDP}
                  src={user.avatarImage}
                  width={30}
                  height={30}
                />
              )}
              <div
                style={{
                  padding: dropDown ? "8px" : "0px",
                  width: dropDown ? "130px" : "0px",
                  height: dropDown ? "108px" : "0px",
                }}
                className={styles.dropDown}
              >
                <Link className={styles.button} href={`/user/${user._id}`}>
                  Profile
                </Link>
                <Link className={styles.button} href={"/blog/create"}>
                  Create Blog
                </Link>
                <Link className={styles.button} href={"/"}>
                  Help & Support
                </Link>
                <Logout />
              </div>
            </>
          ) : (
            <div className="transition ease-in-out px-2 py-[2px] text-sm rounded-sm cursor-pointer hover:bg-black hover:text-white">
              <Link className="text-sm" href={"/user/signup"}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;
