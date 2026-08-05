ALTER TABLE player_snapshot_entries
    ADD COLUMN positions TEXT[];

UPDATE player_snapshot_entries
SET positions = ARRAY[position];

ALTER TABLE player_snapshot_entries
    ALTER COLUMN positions SET NOT NULL;

ALTER TABLE player_snapshot_entries
    ADD CONSTRAINT player_snapshot_entries_positions_check CHECK (
        cardinality(positions) > 0
        AND positions <@ ARRAY[
            'GK', 'DEF', 'MID', 'FWD',
            'LB', 'LWB', 'CB', 'RB', 'RWB',
            'CDM', 'CM', 'CAM', 'LM', 'RM',
            'LW', 'RW', 'CF', 'ST'
        ]::TEXT[]
    );
