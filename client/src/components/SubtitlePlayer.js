import React, { useCallback, useEffect, useState, useMemo, useRef, createRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { keysAreEqual } from './Util';
import { detectCopy } from './KeyEvents';
import { useWindowSize } from '../hooks/useWindowSize';
import Fade from '@material-ui/core/Fade';
import FileCopy from '@material-ui/icons/FileCopy';
import IconButton from '@material-ui/core/IconButton';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';

const useSubtitlePlayerStyles = (compressed, windowWidth) => makeStyles((theme) => ({
    container: {
        height: 'calc(100vh - 64px)',
        position: 'relative',
        overflowX: 'hidden',
        backgroundColor: theme.palette.background.default,
        width: compressed ? Math.max(350, .25 * windowWidth) : '100%'
    },
    table: {
        backgroundColor: theme.palette.background.default,
        marginBottom: 75, // so the last row doesn't collide with controls
    },
    noSubtitles: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 15,
        textAlign: "center"
    },
    subtitleRow: {
        '&:hover': {
            backgroundColor: theme.palette.action.hover
        }
    },
    subtitle: {
        fontSize: 20,
        paddingRight: 0,
        minWidth: 200,
        width: '100%',
        overflowWrap: 'anywhere'
    },
    compressedSubtitle: {
        fontSize: 16,
        paddingRight: 0,
        minWidth: 200,
        width: '100%',
        overflowWrap: 'anywhere'
    },
    timestamp: {
        fontSize: 14,
        color: '#aaaaaa',
        textAlign: 'right',
        paddingRight: 15,
        paddingLeft: 5
    },
    copyButton: {
        textAlign: 'right',
        padding: 0
    },
}));

export default function SubtitlePlayer(props) {
    const {clock, onSeek, onCopy, playing, subtitles, length, jumpToSubtitle, compressed, loading, displayHelp} = props;
    const clockRef = useRef();
    clockRef.current = clock;
    const subtitleListRef = useRef();
    subtitleListRef.current = subtitles;
    const subtitleRefs = useMemo(() => subtitles
        ? Array(subtitles.length).fill().map((_, i) => createRef())
        : [], [subtitles]);
    const subtitleRefsRef = useRef();
    subtitleRefsRef.current = subtitleRefs;
    const [selectedSubtitleIndexes, setSelectedSubtitleIndexes] = useState({});
    const selectedSubtitleIndexesRef = useRef({});
    const lengthRef = useRef();
    lengthRef.current = props.length;
    const lastScrollTimestampRef = useRef(0);
    const requestAnimationRef = useRef();
    const containerRef = useRef();
    const drawerOpenRef = useRef();
    drawerOpenRef.current = props.drawerOpen;
    const [windowWidth, ] = useWindowSize(true);
    const classes = useSubtitlePlayerStyles(compressed, windowWidth)();

    // This effect should be scheduled only once as re-scheduling seems to cause performance issues.
    // Therefore all of the state it operates on is contained in refs.
    useEffect(() => {
        const update = (time) => {
            const subtitles = subtitleListRef.current || [];
            const subtitleRefs = subtitleRefsRef.current;
            const length = lengthRef.current;
            const clock = clockRef.current;
            const progress = clock.progress(lengthRef.current);

            let smallestIndex = Number.MAX_SAFE_INTEGER;
            let fallbackIndex = -1;
            const currentSubtitleIndexes = {};

            for (let i = subtitles.length - 1; i >= 0; --i) {
                const s = subtitles[i];
                const start = s.start / length;
                const end = s.end / length;

                if (progress >= start) {
                    if (progress < end) {
                        smallestIndex = i < smallestIndex ? i : smallestIndex;
                        currentSubtitleIndexes[i] = true;
                    }

                    if (fallbackIndex === -1) {
                        fallbackIndex = i;
                    }
                } else if (smallestIndex !== Number.MAX_SAFE_INTEGER) {
                    break;
                }
            }

            // Attempt to highlight *something* if no subtitles were found at the current timestamp
            if (smallestIndex === Number.MAX_SAFE_INTEGER && fallbackIndex !== -1) {
                currentSubtitleIndexes[fallbackIndex] = true;
            }

            if (!keysAreEqual(currentSubtitleIndexes, selectedSubtitleIndexesRef.current)) {
                selectedSubtitleIndexesRef.current = currentSubtitleIndexes;
                setSelectedSubtitleIndexes(currentSubtitleIndexes);

                if (smallestIndex !== Number.MAX_SAFE_INTEGER) {
                    const scrollToSubtitleRef = subtitleRefs[smallestIndex];
                    const allowScroll = Date.now() - lastScrollTimestampRef.current > 5000;

                    if (scrollToSubtitleRef?.current && allowScroll) {
                        scrollToSubtitleRef.current.scrollIntoView({
                            block: "center",
                            inline: "nearest",
                            behavior: "smooth"
                        });
                    }
                }
            }

            requestAnimationRef.current = requestAnimationFrame(update);
        };

        requestAnimationRef.current = requestAnimationFrame(update);

        return () => cancelAnimationFrame(requestAnimationRef.current);
    }, []);

    useEffect(() => {
        function handleKey(event) {
            if (!subtitles || subtitles.length === 0) {
                return;
            }

            let newSubtitleIndex;

            if (event.keyCode === 37) {
                const selected = Object.keys(selectedSubtitleIndexes);
                newSubtitleIndex = selected.length > 0
                    ? Math.max(0, Math.min(...selected) - 1)
                    : -1;
            } else if (event.keyCode === 39) {
                const selected = Object.keys(selectedSubtitleIndexes);
                newSubtitleIndex = selected.length > 0
                    ? Math.min(subtitles.length - 1, Math.max(...selected) + 1)
                    : -1;
            } else {
                return;
            }

            if (newSubtitleIndex !== -1) {
                event.preventDefault();
                const progress = subtitles[newSubtitleIndex].start / length;
                onSeek(progress, false);
            }
        };

        window.addEventListener('keydown', handleKey);

        return () => window.removeEventListener('keydown', handleKey);
    }, [onSeek, selectedSubtitleIndexes, subtitles, length]);

    useEffect(() => {
        function handleScroll(event) {
            lastScrollTimestampRef.current = Date.now();
        };

        const table = containerRef.current;
        table?.addEventListener('wheel', handleScroll);

        return () => table?.removeEventListener('wheel', handleScroll);
    }, [containerRef, lastScrollTimestampRef]);

    useEffect(() => {
        if (!jumpToSubtitle || !subtitles) {
            return;
        }

        let jumpToIndex = -1;
        let i = 0;

        for (let s of subtitles) {
            if (s.originalStart === jumpToSubtitle.originalStart && s.text === jumpToSubtitle.text) {
                jumpToIndex = i;
                break;
            }

            ++i;
        }

        if (jumpToIndex !== -1) {
            subtitleRefs[jumpToIndex].current.scrollIntoView({
                 block: "center",
                 inline: "nearest",
                 behavior: "smooth"
            });
        }
    }, [jumpToSubtitle, subtitles, subtitleRefs]);

    const handleClick = useCallback((subtitleIndex) => {
        const progress = subtitles[subtitleIndex].start / length;
        onSeek(progress, !playing && subtitleIndex in selectedSubtitleIndexes);
    }, [subtitles, length, playing, onSeek, selectedSubtitleIndexes]);

    const handleCopy = useCallback((event, subtitleIndex) => {
        event.stopPropagation();
        const subtitle = subtitles[subtitleIndex];
        const text = subtitle.text;
        navigator.clipboard.writeText(text);
        onCopy(subtitle);
    }, [subtitles, onCopy]);

    useEffect(() => {
        function copySubtitle(event) {
            const subtitleIndexes = Object.keys(selectedSubtitleIndexesRef.current);

            if (subtitleIndexes.length === 0) {
                return;
            }

            if (!detectCopy(event)) {
                return;
            }

            const index = Math.min(...subtitleIndexes);
            handleCopy(event, index);
        }

        window.addEventListener('keydown', copySubtitle);

        return () => window.removeEventListener('keydown', copySubtitle);
    }, [handleCopy]);

    let subtitleTable;

    if (!subtitles || subtitles.length ===0) {
        subtitleTable = !loading && displayHelp && (
            <div className={classes.noSubtitles}>
                <Typography>
                    No subtitles loaded. Drag and drop to load.
                </Typography>
            </div>
        );
    } else {
        subtitleTable = (
            <TableContainer className={classes.table}>
                <Table>
                    <TableBody>
                        {subtitles.map((s, index) => {
                            const selected = index in selectedSubtitleIndexes;

                            let className = compressed ? classes.compressedSubtitle : classes.subtitle;

                            if (s.start < 0 && s.end < 0) {
                                return null;
                            }

                            return (
                               <TableRow
                                   onClick={(e) => handleClick(index)}
                                   key={index}
                                   ref={subtitleRefs[index]}
                                   selected={selected}
                                   className={classes.subtitleRow}
                               >
                                    <TableCell className={className}>
                                        {s.text}
                                    </TableCell>
                                    <TableCell className={classes.copyButton}>
                                        <IconButton onClick={(e) => handleCopy(e, index)}>
                                            <FileCopy fontSize={compressed ? "small" : "default"} />
                                        </IconButton>
                                    </TableCell>
                                    <TableCell className={classes.timestamp}>
                                        {s.displayTime}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    return (
        <Paper
            square
            elevation={0}
            ref={containerRef}
            className={classes.container}
        >
            {subtitleTable}
        </Paper>
    );
}