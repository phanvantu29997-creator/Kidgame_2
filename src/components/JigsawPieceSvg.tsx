import React, { useId } from 'react';
import { BOARD_SIZE, PuzzlePieceDef } from '../utils/jigsaw';

interface JigsawPieceSvgProps {
  piece: PuzzlePieceDef;
  imageUrl: string;
  imageFailed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showStroke?: boolean;
  strokeColor?: string;
}

export const JigsawPieceSvg: React.FC<JigsawPieceSvgProps> = ({
  piece,
  imageUrl,
  imageFailed = false,
  className = '',
  style,
  showStroke = true,
  strokeColor = 'rgba(45, 42, 38, 0.35)',
}) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `clip-${uid}-${piece.id}`;
  const { x, y, width, height } = piece.bbox;

  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={`block overflow-visible ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={piece.path} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {!imageFailed ? (
          <image
            href={imageUrl}
            x={0}
            y={0}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <rect
            x={0}
            y={0}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            fill="#FDE68A"
          />
        )}
      </g>

      {showStroke && (
        <>
          <path
            d={piece.path}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={4.5}
            strokeLinejoin="round"
          />
          <path
            d={piece.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
};
