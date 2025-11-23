import { useState, useEffect } from "react"

type BackgroundProps = {
    src: string,
    fadeDuration: number
}

export default function Background({ src, fadeDuration = 800 }: BackgroundProps) {

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        const image = new Image(); //preload the image silently in the background.
        image.src = src;
        image.onload = () => setLoaded(true); //mark as loaded after finishing.
    }
    ,[src])


    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden -z-10">
            <img
                src={src}
                alt=""
                loading="lazy"
                className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-${fadeDuration} ${
                loaded ? "opacity-100" : "opacity-0"
                }`}
            />
        </div>
    );

}