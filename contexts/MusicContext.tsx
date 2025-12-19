import React, { createContext, useState, useContext, ReactNode, useRef, useCallback, useEffect } from 'react';

interface Station {
    name: string;
    url: string;
}

const STATIONS: Station[] = [
    { name: 'Rock FM', url: 'https://live.rockfm.ro/rockfm.aacp' },
    { name: 'Radio Guerilla', url: 'https://live.radioguerilla.ro/bits/guerilla.aac' },
    { name: 'Classic Rock Florida HD', url: 'https://vip2.fastcast4u.com/proxy/classicrock?mp=/1' },
    { name: 'GotRadio - Blues', url: 'https://pureplay.cdnstream1.com/6020_128.mp3' },
    { name: 'Frisky Deep', url: 'https://fr.frisky.fm/frisky.mp3' },
    { name: 'SomaFM: Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { name: 'Radio Paradise', url: 'https://stream.radioparadise.com/mp3-192' },
    { name: 'BBC Radio 1', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one' },
    { name: 'BBC Radio 2', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_two' },
    { name: 'BBC Radio 6 Music', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_6music' },
    { name: 'KEXP 90.3 FM', url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3' },
    { name: 'Absolute Radio', url: 'https://ais.absoluteradio.co.uk/absolute-main.mp3' },
    { name: 'Jazz24', url: 'https://jazz24.org/streams/mp3-128' },
    { name: 'WDR 3', url: 'https://wdr-wdr3-live.icecast.wdr.de/wdr/wdr3/live/mp3/128/stream.mp3' },
    { name: 'France Inter', url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3' },
    { name: 'RNE Clásica', url: 'https://rtvelivestreams.akamaized.net/rtvesec/rne_rclas_main.mp3' },
    { name: 'Kiss FM Romania', url: 'https://live.kissfm.ro/kissfm.aacp' },
    { name: 'Europa FM Romania', url: 'https://astreaming.europafm.ro/europafm_mp3_64k' },
    { name: 'Magic FM', url: 'https://live.magicfm.ro/magicfm.aacp' },
    { name: 'ProFM', url: 'https://edge126.rcs-rds.ro/profm/profm.mp3' },
    { name: 'Digi FM', url: 'https://edge7.rcs-rds.ro/digifm/digifm.mp3' },
    { name: 'Virgin Radio', url: 'https://astreaming.virginradio.ro/virgin_mp3_64k' },
    { name: 'Dance FM', url: 'https://live.dancefm.ro/dancefm.aacp' },
    { name: 'Chill FM', url: 'https://edge126.rcs-rds.ro/chillfm/chillfm.mp3' },
    { name: 'Itsy Bitsy', url: 'https://live.itsybitsy.ro/itsybitsy.aacp' },
    { name: 'Tananana', url: 'https://live.tananana.ro/stream' },
    { name: 'Gold FM', url: 'https://live.goldfm.ro/goldfm.aacp' },
    { name: 'Bucuresti FM', url: 'https://live-srr.thassos.ro/rrb_aacp' },
    { name: 'Radio ZU', url: 'https://live.radiozu.ro/radiozu.aacp' },
    { name: 'NPR', url: 'https://npr-ice.streamguys1.com/live.mp3' },
    { name: 'Linn Jazz', url: 'https://hifi.linn.co.uk/files/-320.mp3' },
    { name: 'SomaFM: DEF CON Radio', url: 'https://ice1.somafm.com/defcon-128-mp3' },
    { name: 'Radio Swiss Classic', url: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128' },
    { name: 'Radio Swiss Jazz', url: 'https://stream.srg-ssr.ch/m/rsj/mp3_128' },
    { name: 'Radio Swiss Pop', url: 'https://stream.srg-ssr.ch/m/rsp/mp3_128' },
    { name: '80s80s', url: 'https://80s80s.hoerradar.de/80s80s-mp3-128' },
    { name: '90s90s', url: 'https://90s90s.hoerradar.de/90s90s-mp3-128' },
    { name: 'Antenne Bayern', url: 'https://s3.antenne.de/antenne' },
    { name: 'Bayern 3', url: 'https://br-br3-live.cast.addradio.de/br/br3/live/mp3/128/stream.mp3' },
    { name: 'FM4', url: 'https://fm4.orf.at/player/fastcast/mp3/128' },
    { name: 'Rai Radio 3', url: 'https://icestreaming.rai.it/3.mp3' },
    { name: 'RTÉ Radio 1', url: 'https://icecast1.rte.ie/radio1' },
    { name: 'TSF Jazz', url: 'https://tsfjazz.ice.infomaniak.ch/tsfjazz-high.mp3' },
    { name: 'NTS Radio', url: 'https://stream-relay-geo.ntslive.net/stream' },
    { name: 'The Lot Radio', url: 'https://thelot.out.airtime.pro/thelot_a' },
    { name: 'Dublab', url: 'https://dublab.out.airtime.pro/dublab_a' },
    { name: 'FIP', url: 'https://icecast.radiofrance.fr/fip-hifi.mp3' },
    { name: 'Ibiza Global Radio', url: 'https://listenssl.ibizaglobalradio.com:8024/stream' },
    { name: 'Cinemix', url: 'https://kathy.torontocast.com:2455/stream' },
    { name: 'Frisky Radio', url: 'https://stream.frisky.house/frisky_mp3_192' },
    { name: 'Proton Radio', url: 'https://shout.protonradio.com:8000/pr_192_mp3' },
    { name: 'Digitally Imported - Trance', url: 'https://pub03.di.fm/di_trance_hi' },
    { name: 'Digitally Imported - Techno', url: 'https://pub03.di.fm/di_techno_hi' },
    { name: 'WQXR Classical', url: 'https://stream.wqxr.org/wqxr.aac' },
    { name: 'Klassik Radio', url: 'https://klassikradio.stream.laut.fm/klassikradio' },
    { name: 'Venice Classic Radio', url: 'https://s2.icestream.it:8010/stream' },
    { name: 'Ambient Sleeping Pill', url: 'https://radio.ambientsleepingpill.com/stream' },
    { name: 'Cafe del Mar', url: 'https://radio.cafedelmar.com/stream' },
    { name: 'Mellow Magic', url: 'https://media-ssl.musicradio.com/MellowMagic' },
    { name: 'Smooth Chill', url: 'https://media-ssl.musicradio.com/SmoothChill' },
    { name: 'Lounge FM', url: 'https://loungefm.ice.infomaniak.ch/loungefm-128.mp3' },
    { name: 'RTE Lyric FM', url: 'https://icecast1.rte.ie/lyric' },
    { name: 'Deutschlandfunk', url: 'https://st01.dlf.de/dlf/01/128/mp3/stream.mp3' },
    { name: 'SWR2', url: 'https://swr-swr2-live.cast.addradio.de/swr/swr2/live/mp3/128/stream.mp3' },
    { name: 'Radio Classique', url: 'https://radioclassique.ice.infomaniak.ch/radioclassique-high.mp3' },
    { name: 'Radio Romania Muzical', url: 'https://live-srr.thassos.ro/rrm_aacp' },
    { name: 'Radio Romania Actualitati', url: 'https://live-srr.thassos.ro/rra_aacp' },
    { name: 'B5 aktuell', url: 'https://br-b5aktuell-live.cast.addradio.de/br/b5aktuell/live/mp3/128/stream.mp3' },
    { name: 'WNYC-FM', url: 'https://fm939.wnyc.org/wnycfm' },
    { name: 'La Première', url: 'https://radios.rtbf.be/lapremiere-128.mp3' },
    { name: 'France Musique', url: 'https://icecast.radiofrance.fr/francemusique-hifi.mp3' },
    { name: 'Radio Nova', url: 'https://radionova.ice.infomaniak.ch/radionova-high.mp3' },
    { name: 'Nostalgie', url: 'https://scdn.nrjaudio.fm/fr/30601/mp3_128.mp3?origine=fluxradios' },
    { name: 'NRJ', url: 'https://scdn.nrjaudio.fm/fr/30001/mp3_128.mp3' },
    { name: 'Capital FM', url: 'https://media-ssl.musicradio.com/Capital' },
    { name: 'Heart UK', url: 'https://media-ssl.musicradio.com/Heart' },
    { name: 'Radio 538', url: 'https://20873.live.streamtheworld.com/RADIO538.mp3' },
    { name: 'Slam!', url: 'https://20873.live.streamtheworld.com/SLAM_MP3_SC.mp3' },
    { name: '100% NL', url: 'https://stream.100p.nl/100pnl.mp3' },
    { name: 'Qmusic', url: 'https://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3' },
    { name: 'Studio Brussel', url: 'https://icecast.vrt.be/stubru-high.mp3' },
    { name: 'Radio 1 (BE)', url: 'https://icecast.vrt.be/radio1-high.mp3' },
    { name: 'P3', url: 'https://live-aac.sr.se/p3-128.aac' },
    { name: 'DR P3', url: 'https://live-mp3.gss.dr.dk/p3-128' },
    { name: 'YLE Radio Suomi', url: 'https://yleradiosuomi.fi/radiosuomi.mp3' },
    { name: 'Radio Norge', url: 'https://stream.bauermedia.no/radionorge-aac' },
    { name: 'The Current', url: 'https://current.stream.publicradio.org/kcmp_128.mp3' },
    { name: 'WFUV', url: 'https://wfuv-web.streamguys1.com/wfuv-hi' },
    { name: 'KCRW', url: 'https://kcrw.streamguys1.com/kcrw_192k_mp3_e24_internet_radio' },
    { name: 'Triple J', url: 'https://live-radio01.mediahubaustralia.com/3JJJ/mp3/' },
    { name: 'FluxFM', url: 'https://streams.fluxfm.de/live/mp3-320/audio/' },
    { name: 'ByteFM', url: 'https://stream.byte.fm/bytefm-128-mp3' },
    { name: 'EgoFM', url: 'https://edge.egofm.de/egofm/stream/mp3' },
    { name: 'Radio X', url: 'https://media-ssl.musicradio.com/RadioX' },
    { name: 'Planet Rock', url: 'https://stream-al.planetrock.com/planetrock.mp3' },
    { name: 'Kerrang! Radio', url: 'https://stream-al.kerrangradio.co.uk/kerrang.mp3' },
    { name: 'Radio Bob!', url: 'https://bob.hoerradar.de/radiobob-live-mp3-128' },
    { name: 'Star FM', url: 'https://streams.starfm.de/sfn-berlin.mp3' },
    { name: 'Rock Antenne', url: 'https://s2.rockantenne.de/rockantenne' },
    { name: 'Metal Hammer', url: 'https://radio.metal-hammer.de/metal-hammer' },
    { name: 'Motor FM', url: 'https://motorfm.stream.laut.fm/motorfm' },
    { name: 'SomaFM: Indie Pop Rocks!', url: 'https://ice1.somafm.com/indiepop-128-mp3' },
    { name: 'SomaFM: Lush', url: 'https://ice1.somafm.com/lush-128-mp3' },
    { name: 'SomaFM: Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
    { name: 'SomaFM: Beat Blender', url: 'https://ice1.somafm.com/beatblender-128-mp3' },
    { name: 'SomaFM: Cliqhop IDM', url: 'https://ice1.somafm.com/cliqhop-128-mp3' },
];

interface MusicContextType {
    currentStation: Station | null;
    isPlaying: boolean;
    togglePlay: () => void;
    playNext: () => void;
    playPrev: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentStationIndex, setCurrentStationIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && currentStationIndex !== null) {
            const station = STATIONS[currentStationIndex];
            if (audio.src !== station.url) {
                audio.src = station.url;
            }
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Error playing audio:", e);
                    setIsPlaying(false);
                });
            }
        } else {
            audio.pause();
        }
    }, [isPlaying, currentStationIndex]);

    const togglePlay = useCallback(() => {
        if (currentStationIndex === null) {
            setCurrentStationIndex(0);
            setIsPlaying(true);
        } else {
            setIsPlaying(prev => !prev);
        }
    }, [currentStationIndex]);

    const playNext = useCallback(() => {
        setCurrentStationIndex(prevIndex => {
            const nextIndex = (prevIndex ?? -1) + 1;
            return nextIndex >= STATIONS.length ? 0 : nextIndex;
        });
        if (!isPlaying) {
            setIsPlaying(true);
        }
    }, [isPlaying]);

    const playPrev = useCallback(() => {
        setCurrentStationIndex(prevIndex => {
            const prevIndexVal = (prevIndex ?? 1) - 1;
            return prevIndexVal < 0 ? STATIONS.length - 1 : prevIndexVal;
        });
        if (!isPlaying) {
            setIsPlaying(true);
        }
    }, [isPlaying]);


    const currentStation = currentStationIndex !== null ? STATIONS[currentStationIndex] : null;

    return (
        <MusicContext.Provider value={{ currentStation, isPlaying, togglePlay, playNext, playPrev }}>
            <audio ref={audioRef} crossOrigin="anonymous" />
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (context === undefined) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};
