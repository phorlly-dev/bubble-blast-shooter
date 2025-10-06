import * as React from "react";
import { offEvent, onEvent } from "../hooks/remote";

const Footer = () => {
    const [color, setColor] = React.useState(3);
    React.useEffect(() => {
        const handle = (data) => setColor(data);
        onEvent("color", handle);

        return () => offEvent("color", handle);
    }, [color]);

    return (
        <footer className="d-flex justify-content-center">
            <section className="card-footer w-100 small d-flex flex-column text-center p-3 shadow-sm">
                <p className="fs-6 mb-2">
                    Shoot to hit{" "}
                    <span className="text-capitalize me-1 text-primary fw-semibold">
                        3 or more
                    </span>
                    bubbles of the same{" "}
                    <span className="text-warning fw-semibold">{color}</span>{" "}
                    colors!
                </p>

                <p className="text-muted mb-1">
                    Release to shoot the balls.
                    <span className="text-info ms-1">
                        Clear all the bubbles to win!
                    </span>
                </p>
            </section>
        </footer>
    );
};

export default Footer;
