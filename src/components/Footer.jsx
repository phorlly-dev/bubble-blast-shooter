import * as React from "react";

const Footer = () => {
    React.useEffect(() => {}, []);

    return (
        <footer className="d-flex justify-content-center">
            <section
                className="card-footer small d-flex flex-column text-center p-3 shadow-sm"
                style={{ width: "100%" }}
            >
                <p className="fs-6 mb-2">
                    Shoot to hit{" "}
                    <span className="text-capitalize me-1 text-primary fw-semibold">
                        3 or more
                    </span>
                    balls of the same color!
                </p>

                <p className="text-muted mb-1">
                    Release to shoot the balls.
                    <span className="text-info ms-1">
                        Clear all the balls to win!
                    </span>
                </p>
            </section>
        </footer>
    );
};

export default Footer;
