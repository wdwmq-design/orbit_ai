clear; clc; close all;

%% --- Step 1: Load Image ---
img = imread('images/bmp_4.bmp');
figure; imshow(img); title('Step 1: Raw Input Image');

%% --- Step 2: Detection ---
threshold = 0.4; min_pixels = 4; max_pixels = 50; window_size = 5;

img_double = im2double(img);
img_copy = img_double;

subset = img_copy(4:4:end, 2:2:end);
logical_subset = subset > threshold;

v_detected = [];
pixels = [];

if any(logical_subset(:))
    [rows, cols] = find(logical_subset);
    figure; imshow(img_double, []); hold on;

    for k = 1:length(rows)
        r = rows(k); c = cols(k);
        full_r = r*4; full_c = c*2;

        [star_region, img_copy] = region_growing(img_copy, full_r, full_c, threshold, min_pixels, max_pixels, 0);

        if ~isempty(star_region)
            [cx_u, cy_u] = centroiding(img_double, star_region, window_size);

            x = cy_u; y = cx_u;
            [ux, uy, uz] = pixels_to_unit_vector(x, y);

            v_detected = [v_detected; ux, uy, uz];
            pixels = [pixels; cy_u, cx_u];

            plot(star_region(:,2), star_region(:,1), 'g.');
            plot(cy_u, cx_u, 'rx');
        end
    end
else
    error('No stars detected.');
end

title('Step 2: Detected Stars');
hold off;

%% --- Step A: Detected vectors ---
figure;
[X,Y,Z] = sphere(50);
surf(X,Y,Z,'FaceAlpha',0.05,'EdgeColor','none'); hold on;
axis equal; grid on;

for i = 1:size(v_detected,1)
    quiver3(0,0,0, v_detected(i,1), v_detected(i,2), v_detected(i,3),'r','LineWidth',2);
end

title('Step A: Detected Vectors (Camera Frame)');

%% --- Step 3: Catalog ---
[v_catalog, star_names, ra_deg, dec_deg, mag_catalog] = ...
    catalog_matching('catalogues/gemini.csv');

%% --- Step B: Catalog vectors ---
figure;
[X,Y,Z] = sphere(50);
surf(X,Y,Z,'FaceAlpha',0.05,'EdgeColor','none'); hold on;
axis equal; grid on;

plot3(v_catalog(:,1), v_catalog(:,2), v_catalog(:,3), 'b.');

title('Step B: Catalog Vectors');

%% --- Step 4: DB ---
dbtol = 0.1;
triangle_db = build_triangle_db(v_catalog, dbtol);

%% --- Step 5: Matching ---
matches = pattern_matching(v_detected, triangle_db, v_catalog, dbtol);
if isempty(matches), error('No matches found'); end

%% --- Step 6: Attitude ---
[R_best, bestMatch, v_rotated] = ...
    attitude_determination(v_detected, v_catalog, matches);

%% --- Step C: Triangle match ---
figure;
[X,Y,Z] = sphere(50);
surf(X,Y,Z,'FaceAlpha',0.05,'EdgeColor','none'); hold on;
axis equal; grid on;

v_det_tri = v_detected(bestMatch.det_indices,:);
v_cat_tri = v_catalog(bestMatch.cat_indices,:);

for i = 1:3
    quiver3(0,0,0, v_det_tri(i,1), v_det_tri(i,2), v_det_tri(i,3),'r','LineWidth',3);
    quiver3(0,0,0, v_cat_tri(i,1), v_cat_tri(i,2), v_cat_tri(i,3),'g','LineWidth',3);
end

title('Step C: Triangle Match (Red vs Green)');

%% --- Step D: Rotation ---
figure;
[X,Y,Z] = sphere(50);
surf(X,Y,Z,'FaceAlpha',0.05,'EdgeColor','none'); hold on;
axis equal; grid on;

for i = 1:size(v_detected,1)
    quiver3(0,0,0, v_detected(i,1), v_detected(i,2), v_detected(i,3),'r');
end

for i = 1:size(v_rotated,1)
    quiver3(0,0,0, v_rotated(i,1), v_rotated(i,2), v_rotated(i,3),'b','LineWidth',2);
end

title('Step D: Rotation (Red = Before, Blue = After)');

%% --- FINAL GLOBAL ASSIGNMENT ---
dist = pdist2(v_rotated, v_catalog);

final_indices = zeros(size(v_detected,1),1);
used = false(size(v_catalog,1),1);

for i = 1:size(v_detected,1)
    [~, idx] = sort(dist(i,:));

    for j = 1:length(idx)
        if ~used(idx(j))
            final_indices(i) = idx(j);
            used(idx(j)) = true;
            break;
        end
    end
end

%% -------- FINAL TABLE --------
N = size(v_detected,1);

ResultTable = table(...
    (1:N)', ...
    pixels(:,1), pixels(:,2), ...
    v_detected(:,1), v_detected(:,2), v_detected(:,3), ...
    v_rotated(:,1), v_rotated(:,2), v_rotated(:,3), ...
    v_catalog(final_indices,1), ...
    v_catalog(final_indices,2), ...
    v_catalog(final_indices,3), ...
    string(star_names(final_indices)), ...
    'VariableNames', { ...
    'StarID','Pixel_X','Pixel_Y', ...
    'Det_X','Det_Y','Det_Z', ...
    'Rot_X','Rot_Y','Rot_Z', ...
    'Cat_X','Cat_Y','Cat_Z', ...
    'MatchedStar'});

disp('================ FINAL STAR TABLE ================');
disp(ResultTable);

%% -------- FINAL ATTITUDE --------
disp('================ FINAL ATTITUDE ================');
disp('Rotation Matrix:');
disp(R_best);

yaw   = atan2d(R_best(2,1), R_best(1,1));
pitch = -asind(R_best(3,1));
roll  = atan2d(R_best(3,2), R_best(3,3));

fprintf('Euler Angles (deg):\n');
fprintf('Yaw   = %.3f\n', yaw);
fprintf('Pitch = %.3f\n', pitch);
fprintf('Roll  = %.3f\n', roll);

%% --- Step E: Final matching ---
figure;
[X,Y,Z] = sphere(50);
surf(X,Y,Z,'FaceAlpha',0.05,'EdgeColor','none'); hold on;
axis equal; grid on;

for i = 1:length(final_indices)
    cat_idx = final_indices(i);

    quiver3(0,0,0, v_rotated(i,1), v_rotated(i,2), v_rotated(i,3),'b','LineWidth',2);
    quiver3(0,0,0, v_catalog(cat_idx,1), v_catalog(cat_idx,2), v_catalog(cat_idx,3),'g','LineWidth',2);

    plot3([v_rotated(i,1) v_catalog(cat_idx,1)], ...
          [v_rotated(i,2) v_catalog(cat_idx,2)], ...
          [v_rotated(i,3) v_catalog(cat_idx,3)], 'k--');

    text(v_catalog(cat_idx,1), v_catalog(cat_idx,2), v_catalog(cat_idx,3), ...
        star_names{cat_idx}, 'Color','yellow');
end

title('Step E: Final Matching');

%% --- Image overlay ---
figure;
imshow(img, []); hold on;

plot(pixels(:,1), pixels(:,2), 'go','LineWidth',1.5);

for i = 1:length(final_indices)
    idx = final_indices(i);
    text(pixels(i,1)+10, pixels(i,2), star_names{idx}, ...
        'Color','yellow','FontWeight','bold');
end

title('Final Result on Image');
hold off;